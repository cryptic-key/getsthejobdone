-- Priority Tasks: a parent marks a task as Priority (on the task template, so a daily one repeats each day).
-- While a kid has an open Priority Task that is showing today, the kid can't mark any other task done
-- and can't enter the Monster Arena. Submitting the Priority Task (waiting for approval) lifts the block;
-- if a parent sends it back, the block returns.

alter table public.chore_templates add column if not exists priority boolean not null default false;

-- True while this kid has an open Priority Task on today's board (same visibility rules as kid_snapshot).
create or replace function private.priority_open(p_kid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.chores c
    join public.chore_templates t on t.id = c.template_id
    left join public.chore_sections s on s.id = t.section_id
    where c.kid_id = p_kid
      and t.priority
      and c.status = 'open'
      and (
        c.chore_day is null
        or (
          c.chore_day = (now() at time zone 'America/Toronto')::date
          and (
            t.section_id is null
            or (
              private.section_is_open(s.start_minute, s.end_minute, private.toronto_minute())
              and private.section_applies(s.days, s.kid_ids, p_kid, (now() at time zone 'America/Toronto')::date)
            )
          )
        )
      )
  )
$$;

-- Parent: turn Priority on or off for a task (daily or bonus).
create or replace function private.set_chore_priority(p_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  update public.chore_templates
  set priority = coalesce(p_on, false)
  where id = p_id and household_id = hid;
  if not found then
    raise exception 'chore not found';
  end if;
end;
$$;

create or replace function private.kid_mark_done(p_token text, p_chore uuid, p_proof_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  chore_title text;
  kname text;
  hid uuid;
  proof text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  if proof is null then
    raise exception 'photo required';
  end if;
  if split_part(proof, '/', 1) is distinct from p_chore::text then
    raise exception 'photo required';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'chore-proofs' and o.name = proof
  ) then
    raise exception 'photo required';
  end if;
  -- A Priority Task has to be finished before any other task.
  if private.priority_open(kid) and not exists (
    select 1 from public.chores c
    join public.chore_templates t on t.id = c.template_id
    where c.id = p_chore and c.kid_id = kid and t.priority
  ) then
    raise exception 'priority first';
  end if;
  update public.chores
  set status = 'submitted', verdict = null, proof_path = proof
  where id = p_chore and kid_id = kid and status = 'open'
  returning chores.title, chores.household_id into chore_title, hid;
  if chore_title is null then
    raise exception 'chore not found';
  end if;
  select name into kname from public.kids where id = kid;
  insert into public.activity (household_id, kid_id, body)
  values (hid, kid, kname || ' marked ' || chore_title || ' done.');
end;
$$;

create or replace function private.kid_arena_start(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  fee integer;
  per integer;
  run_id uuid;
  left_points integer;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid for update;
  if private.is_grounded(child.grounded_until) then
    raise exception 'grounded';
  end if;
  if private.priority_open(kid) then
    raise exception 'priority first';
  end if;
  select arena_entry, arena_per_kill into fee, per from public.households where id = child.household_id;
  if child.points < fee then
    raise exception 'not enough coins';
  end if;
  update public.arena_runs set ended_at = now() where kid_id = kid and ended_at is null;
  update public.kids set points = points - fee where id = kid returning points into left_points;
  insert into public.arena_runs (household_id, kid_id, entry, per_kill)
  values (child.household_id, kid, fee, per)
  returning id into run_id;
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' paid ' || fee || ' coins to enter the Monster Arena.');
  return jsonb_build_object(
    'run_id', run_id,
    'entry', fee,
    'per_kill', per,
    'points', left_points,
    'level', private.arena_level(child.birth_date)
  );
end;
$$;

create or replace function private.kid_snapshot(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  hid uuid;
  result jsonb;
  today date := (now() at time zone 'America/Toronto')::date;
  now_min integer := private.toronto_minute();
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select household_id into hid from public.kids where id = kid;
  perform private.ensure_daily(hid);
  select jsonb_build_object(
    'family', jsonb_build_object(
      'name', h.name,
      'code', h.code,
      'points_per_dollar', h.points_per_dollar,
      'points_per_30', h.points_per_30,
      'unground_points', h.unground_points,
      'arena_entry', h.arena_entry,
      'arena_per_kill', h.arena_per_kill
    ),
    'kid', jsonb_build_object(
      'id', k.id,
      'name', k.name,
      'color', k.color,
      'points', k.points,
      'cash_cents', k.cash_cents,
      'minutes', k.minutes,
      'grounded_until', k.grounded_until,
      'hearts', k.hearts,
      'ground_progress', k.ground_progress,
      'warn_parent', k.warn_parent,
      'warn_seq', k.warn_seq,
      'hero', k.hero,
      'weapon', k.weapon,
      'pet', k.pet,
      'birth_date', k.birth_date,
      'arena_level', private.arena_level(k.birth_date),
      'priority_open', private.priority_open(k.id)
    ),
    'chores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'points', c.points,
        'cash_cents', c.cash_cents, 'minutes', c.minutes, 'status', c.status,
        'sprite', c.sprite,
        'verdict', c.verdict,
        'proof_path', c.proof_path,
        'special', (c.chore_day is null),
        'section_id', t.section_id,
        'section_title', s.title,
        'section_start', s.start_minute,
        'section_end', s.end_minute,
        'sort_order', coalesce(t.sort_order, 0),
        'priority', coalesce(t.priority, false)
      ) order by
        case when coalesce(t.priority, false) then 0 else 1 end,
        case when c.chore_day is null then 1 else 0 end,
        coalesce(s.sort_order, -1),
        coalesce(t.sort_order, 0),
        c.created_at
      )
      from public.chores c
      left join public.chore_templates t on t.id = c.template_id
      left join public.chore_sections s on s.id = t.section_id
      where c.kid_id = k.id and c.status <> 'approved'
        and (c.chore_day is null or c.chore_day = today)
        and (
          c.chore_day is null
          or c.status = 'submitted'
          or c.verdict = 'flee'
          or t.section_id is null
          or (
            private.section_is_open(s.start_minute, s.end_minute, now_min)
            and private.section_applies(s.days, s.kid_ids, k.id, today)
          )
        )
    ), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'start_minute', s.start_minute,
        'end_minute', s.end_minute,
        'open', private.section_is_open(s.start_minute, s.end_minute, now_min),
        'sort_order', s.sort_order
      ) order by s.sort_order, s.created_at)
      from public.chore_sections s
      where s.household_id = k.household_id
        and private.section_applies(s.days, s.kid_ids, k.id, today)
    ), '[]'::jsonb),
    'week', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'points', coalesce(e.points, 0),
        'cash_cents', coalesce(e.cash_cents, 0)
      ) order by d)
      from generate_series(today - 6, today, interval '1 day') as d
      left join (
        select coalesce(c.chore_day, (c.approved_at at time zone 'America/Toronto')::date) as day,
               sum(case when c.caged then 0 else c.points end)::int as points,
               sum(c.cash_cents)::int as cash_cents
        from public.chores c
        where c.kid_id = k.id and c.status = 'approved' and c.approved_at is not null
          and (k.progress_reset_at is null or c.approved_at > k.progress_reset_at)
        group by 1
      ) e on e.day = d::date
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'cost', i.cost) order by i.created_at)
      from public.shop_items i
      where i.household_id = k.household_id
    ), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'item_id', r.item_id, 'status', r.status))
      from public.requests r
      where r.kid_id = k.id and r.status = 'pending'
    ), '[]'::jsonb),
    'pets', coalesce((
      select jsonb_agg(key order by earned_at)
      from public.kid_rewards
      where kid_id = k.id and kind = 'pet'
    ), '[]'::jsonb),
    'pet_prices', coalesce((
      select jsonb_object_agg(pet_key, cost)
      from public.pet_prices
      where household_id = k.household_id
    ), '{}'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'body', a.body, 'created_at', a.created_at) order by a.created_at desc)
      from (
        select * from public.activity
        where kid_id = k.id
        order by created_at desc
        limit 8
      ) a
    ), '[]'::jsonb)
  ) into result
  from public.kids k
  join public.households h on h.id = k.household_id
  where k.id = kid;
  return result;
end;
$$;

create or replace function public.set_chore_priority(p_id uuid, p_on boolean)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.set_chore_priority(p_id, p_on); end $$;

revoke all on function private.priority_open(uuid) from public, anon, authenticated;
revoke all on function private.set_chore_priority(uuid, boolean) from public, anon, authenticated;
revoke all on function public.set_chore_priority(uuid, boolean) from public, anon, authenticated;
grant execute on function private.priority_open(uuid) to anon, authenticated;
grant execute on function private.set_chore_priority(uuid, boolean) to authenticated;
grant execute on function public.set_chore_priority(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
