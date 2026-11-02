-- Heart gift: when a parent gives a heart back, the kid sees the parent walk in and toss them a heart.
-- It reuses the warning channel (warn_parent / warn_seq) with a new warn_kind column: 'warn' or 'heart'.
-- A trigger resets warn_kind to 'warn' whenever warn_seq moves without warn_kind being set,
-- so warn_kid needs no changes.

alter table public.kids add column if not exists warn_kind text not null default 'warn';
alter table public.kids drop constraint if exists kids_warn_kind_check;
alter table public.kids add constraint kids_warn_kind_check check (warn_kind in ('warn', 'heart'));

create or replace function private.reset_warn_kind()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.warn_seq is distinct from old.warn_seq and new.warn_kind is not distinct from old.warn_kind then
    new.warn_kind := 'warn';
  end if;
  return new;
end;
$$;

drop trigger if exists kids_reset_warn_kind on public.kids;
create trigger kids_reset_warn_kind
  before update of warn_seq on public.kids
  for each row execute function private.reset_warn_kind();

create or replace function private.give_heart(p_kid uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  child public.kids%rowtype;
  pname text;
  next_hearts integer;
begin
  select * into child from public.kids where id = p_kid and household_id = hid;
  if child.id is null then
    raise exception 'kid not found';
  end if;
  if private.is_grounded(child.grounded_until) then
    raise exception 'use Lift to open the cage';
  end if;
  if child.hearts >= 3 then
    raise exception 'hearts are full';
  end if;
  select name into pname from public.parents where user_id = auth.uid() and household_id = hid;
  pname := coalesce(nullif(btrim(pname), ''), 'A parent');
  next_hearts := child.hearts + 1;
  -- Queue the "heart gift" scene for the kid (same channel as warnings, with warn_kind = 'heart').
  update public.kids
  set hearts = next_hearts,
      warn_parent = pname,
      warn_seq = coalesce(child.warn_seq, 0) + 1
  where id = child.id;
  -- Separate update: the trigger only resets warn_kind when warn_seq is in the SET list.
  update public.kids set warn_kind = 'heart' where id = child.id;
  insert into public.activity (household_id, kid_id, body)
  values (
    hid,
    child.id,
    pname || ' gave ' || child.name || ' a heart back. ' || next_hearts || ' heart'
      || case when next_hearts = 1 then '' else 's' end || ' now.'
  );
  return next_hearts;
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
      'warn_kind', k.warn_kind,
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

notify pgrst, 'reload schema';
