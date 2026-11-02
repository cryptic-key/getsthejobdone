-- Schedule sections can run on chosen weekdays and for chosen kids.
-- Parents can give a heart back.
-- Chores approved while grounded feed the cage goal instead of the coin balance.

alter table public.chore_sections add column if not exists days integer[] not null default '{0,1,2,3,4,5,6}';
alter table public.chore_sections add column if not exists kid_ids uuid[];
alter table public.chores add column if not exists caged boolean not null default false;

-- Days use Postgres dow numbering: 0 = Sunday through 6 = Saturday. Null kid_ids means every kid.
create or replace function private.section_applies(p_days integer[], p_kids uuid[], p_kid uuid, p_day date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select (p_days is null or extract(dow from p_day)::integer = any (p_days))
     and (p_kids is null or cardinality(p_kids) = 0 or p_kid = any (p_kids))
$$;

create or replace function private.clean_section_days(p_days integer[])
returns integer[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  cleaned integer[];
begin
  select array_agg(distinct d order by d) into cleaned
  from unnest(coalesce(p_days, '{}'::integer[])) as d
  where d between 0 and 6;
  if cleaned is null then
    raise exception 'pick at least one day';
  end if;
  return cleaned;
end;
$$;

create or replace function private.clean_section_kids(p_household uuid, p_kids uuid[])
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_agg(k.id order by k.created_at)
  from public.kids k
  where k.household_id = p_household and k.id = any (coalesce(p_kids, '{}'::uuid[]))
$$;

drop function if exists public.add_chore_section(text, integer, integer);
drop function if exists private.add_chore_section(text, integer, integer);

create or replace function private.add_chore_section(
  p_title text,
  p_start_minute integer,
  p_end_minute integer,
  p_days integer[] default null,
  p_kids uuid[] default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  title text := btrim(p_title);
  sid uuid;
  next_ord integer;
  start_m integer := ((coalesce(p_start_minute, 0) % 1440) + 1440) % 1440;
  end_m integer := ((coalesce(p_end_minute, 0) % 1440) + 1440) % 1440;
  day_list integer[] := case when p_days is null then '{0,1,2,3,4,5,6}'::integer[] else private.clean_section_days(p_days) end;
begin
  if title is null or title = '' then
    raise exception 'section name required';
  end if;
  select coalesce(max(sort_order), -1) + 1 into next_ord
  from public.chore_sections where household_id = hid;
  insert into public.chore_sections (household_id, title, start_minute, end_minute, sort_order, days, kid_ids)
  values (hid, title, start_m, end_m, next_ord, day_list, private.clean_section_kids(hid, p_kids))
  returning id into sid;
  return sid;
end;
$$;

drop function if exists public.save_chore_section(uuid, text, integer, integer);
drop function if exists private.save_chore_section(uuid, text, integer, integer);

-- p_days / p_kids null leave the saved value alone; an empty p_kids means every kid.
create or replace function private.save_chore_section(
  p_id uuid,
  p_title text,
  p_start_minute integer,
  p_end_minute integer,
  p_days integer[] default null,
  p_kids uuid[] default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  section_title text := btrim(coalesce(p_title, ''));
  start_m integer := ((coalesce(p_start_minute, 0) % 1440) + 1440) % 1440;
  end_m integer := ((coalesce(p_end_minute, 0) % 1440) + 1440) % 1440;
  day_list integer[] := case when p_days is null then null else private.clean_section_days(p_days) end;
begin
  if section_title = '' then
    raise exception 'section name required';
  end if;
  update public.chore_sections
  set
    title = section_title,
    start_minute = start_m,
    end_minute = end_m,
    days = coalesce(day_list, days),
    kid_ids = case when p_kids is null then kid_ids else private.clean_section_kids(hid, p_kids) end
  where id = p_id and household_id = hid;
  if not found then
    raise exception 'section not found';
  end if;
end;
$$;

create or replace function public.add_chore_section(
  p_title text,
  p_start_minute integer,
  p_end_minute integer,
  p_days integer[] default null,
  p_kids uuid[] default null
)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_chore_section(p_title, p_start_minute, p_end_minute, p_days, p_kids) $$;

create or replace function public.save_chore_section(
  p_id uuid,
  p_title text,
  p_start_minute integer,
  p_end_minute integer,
  p_days integer[] default null,
  p_kids uuid[] default null
)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_chore_section(p_id, p_title, p_start_minute, p_end_minute, p_days, p_kids); end $$;

create or replace function private.ensure_daily(p_household uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Toronto')::date;
  expired uuid;
begin
  for expired in
    select id from public.kids
    where household_id = p_household and grounded_until is not null and grounded_until <= now()
    for update skip locked
  loop
    perform private.free_kid(expired);
  end loop;
  insert into public.chores (household_id, kid_id, template_id, title, points, sprite, chore_day)
  select k.household_id, k.id, t.id, t.title, t.points, t.sprite, today
  from public.kids k
  join public.chore_templates t on t.household_id = k.household_id and t.kind = 'daily' and t.active
  left join public.chore_sections s on s.id = t.section_id
  where k.household_id = p_household
    and (s.id is null or private.section_applies(s.days, s.kid_ids, k.id, today))
  on conflict (template_id, kid_id, chore_day) do nothing;
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
      'unground_points', h.unground_points
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
      'pet', k.pet
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
        'sort_order', coalesce(t.sort_order, 0)
      ) order by
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

create or replace function private.approve_chore(p_chore uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  chore public.chores%rowtype;
  child public.kids%rowtype;
  goal integer;
  progress integer;
  in_cage boolean;
begin
  select * into chore
  from public.chores
  where id = p_chore and household_id = hid and status = 'submitted';
  if chore.id is null then
    raise exception 'nothing to approve';
  end if;
  select * into child from public.kids where id = chore.kid_id;
  in_cage := private.is_grounded(child.grounded_until);
  update public.chores set status = 'approved', approved_at = now(), caged = in_cage where id = chore.id;
  update public.kids
  set points = points + case when in_cage then 0 else chore.points end,
      cash_cents = cash_cents + chore.cash_cents,
      minutes = minutes + case when in_cage then 0 else chore.minutes end
  where id = child.id;
  insert into public.activity (household_id, kid_id, body)
  values (
    hid,
    child.id,
    child.name || ' was paid for ' || chore.title || '.'
      || case when in_cage and chore.points > 0 then ' ' || chore.points || ' coins went to the cage.' else '' end
  );

  if in_cage and chore.points > 0 then
    select unground_points into goal from public.households where id = hid;
    update public.kids
    set ground_progress = ground_progress + chore.points
    where id = child.id
    returning ground_progress into progress;
    if coalesce(goal, 0) > 0 and progress >= goal then
      perform private.free_kid(child.id);
    end if;
  end if;
end;
$$;

create or replace function private.undo_approval(p_chore uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  chore public.chores%rowtype;
  kname text;
begin
  select * into chore
  from public.chores
  where id = p_chore and household_id = hid and status = 'approved';
  if chore.id is null then
    raise exception 'nothing to undo';
  end if;
  update public.kids
  set points = greatest(0, points - case when chore.caged then 0 else chore.points end),
      cash_cents = greatest(0, cash_cents - chore.cash_cents),
      minutes = greatest(0, minutes - case when chore.caged then 0 else chore.minutes end),
      ground_progress = case
        when chore.caged and private.is_grounded(grounded_until) then greatest(0, ground_progress - chore.points)
        else ground_progress
      end
  where id = chore.kid_id;
  update public.chores
  set status = 'submitted', approved_at = null, caged = false
  where id = chore.id;
  delete from public.kid_rewards where kid_id = chore.kid_id;
  perform private.sync_kid_rewards(chore.kid_id);
  if coalesce(private.weapon_value((select weapon from public.kids where id = chore.kid_id), private.kid_stats(chore.kid_id)), 0)
     < coalesce((select goal from private.weapon_rules() where key = (select weapon from public.kids where id = chore.kid_id)), 1) then
    update public.kids set weapon = 'broom' where id = chore.kid_id;
  end if;
  select name into kname from public.kids where id = chore.kid_id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, chore.kid_id, 'Approval undone for ' || coalesce(kname, 'a kid') || ' on ' || chore.title || '.');
end;
$$;

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
  update public.kids set hearts = next_hearts where id = child.id;
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

create or replace function public.give_heart(p_kid uuid)
returns integer language sql security invoker set search_path = ''
as $$ select private.give_heart(p_kid) $$;

revoke all on function private.section_applies(integer[], uuid[], uuid, date) from public, anon, authenticated;
revoke all on function private.clean_section_days(integer[]) from public, anon, authenticated;
revoke all on function private.clean_section_kids(uuid, uuid[]) from public, anon, authenticated;
revoke all on function private.add_chore_section(text, integer, integer, integer[], uuid[]) from public, anon, authenticated;
revoke all on function private.save_chore_section(uuid, text, integer, integer, integer[], uuid[]) from public, anon, authenticated;
revoke all on function private.give_heart(uuid) from public, anon, authenticated;
revoke all on function public.add_chore_section(text, integer, integer, integer[], uuid[]) from public, anon, authenticated;
revoke all on function public.save_chore_section(uuid, text, integer, integer, integer[], uuid[]) from public, anon, authenticated;
revoke all on function public.give_heart(uuid) from public, anon, authenticated;

grant execute on function private.section_applies(integer[], uuid[], uuid, date) to authenticated;
grant execute on function private.clean_section_days(integer[]) to authenticated;
grant execute on function private.clean_section_kids(uuid, uuid[]) to authenticated;
grant execute on function private.add_chore_section(text, integer, integer, integer[], uuid[]) to authenticated;
grant execute on function private.save_chore_section(uuid, text, integer, integer, integer[], uuid[]) to authenticated;
grant execute on function private.give_heart(uuid) to authenticated;
grant execute on function public.add_chore_section(text, integer, integer, integer[], uuid[]) to authenticated;
grant execute on function public.save_chore_section(uuid, text, integer, integer, integer[], uuid[]) to authenticated;
grant execute on function public.give_heart(uuid) to authenticated;

notify pgrst, 'reload schema';
