-- New chore monsters (with their weapons and medals) and the Monster Arena.

-- ---------- monster keys ----------
create or replace function private.monster_kinds()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['dust','sleep','dry','breakfast','dinner','lunchmade','bath','bed','shoes','pack','dishes','teeth','laundry','toys','reading','pet','plants','table','trash','counters','towels','bookshelf','lunch','coats','groceries','homework','dressed','petbrush','leaves','snow','outside','wood','basketball','bus','repair','helping','babysit','shirts']
$$;

create or replace function private.normalize_sprite(p_sprite text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when p_sprite = any (private.monster_kinds()) then p_sprite else 'dust' end
$$;

alter table public.chores drop constraint if exists chores_sprite_check;
alter table public.chores add constraint chores_sprite_check check (sprite = any (array['dust','sleep','dry','breakfast','dinner','lunchmade','bath','bed','shoes','pack','dishes','teeth','laundry','toys','reading','pet','plants','table','trash','counters','towels','bookshelf','lunch','coats','groceries','homework','dressed','petbrush','leaves','snow','outside','wood','basketball','bus','repair','helping','babysit','shirts']));
alter table public.chore_templates drop constraint if exists chore_templates_sprite_check;
alter table public.chore_templates add constraint chore_templates_sprite_check check (sprite = any (array['dust','sleep','dry','breakfast','dinner','lunchmade','bath','bed','shoes','pack','dishes','teeth','laundry','toys','reading','pet','plants','table','trash','counters','towels','bookshelf','lunch','coats','groceries','homework','dressed','petbrush','leaves','snow','outside','wood','basketball','bus','repair','helping','babysit','shirts']));

-- ---------- weapons ----------
create or replace function private.weapon_rules()
returns table (key text, mode text, goal integer, chore text)
language sql
immutable
set search_path = ''
as $$
  select * from (values
    ('broom', 'starter', 1, null::text),
    ('duster', 'streak', 3, null::text),
    ('dustpan', 'total', 10, null::text),
    ('mop', 'streak', 7, null::text),
    ('sponge', 'total', 25, null::text),
    ('squeegee', 'streak', 14, null::text),
    ('spray', 'total', 50, null::text),
    ('vacuum', 'streak', 21, null::text),
    ('plunger', 'total', 75, null::text),
    ('golden', 'streak', 30, null::text),
    ('diamond', 'total', 100, null::text),
    ('toothbrush', 'chore', 20, 'teeth'),
    ('spatula', 'chore', 20, 'dishes'),
    ('bubble', 'chore', 50, 'dishes'),
    ('rake', 'chore', 10, 'leaves'),
    ('pencil', 'chore', 20, 'homework'),
    ('lint', 'chore', 30, 'laundry'),
    ('watering', 'chore', 20, 'plants'),
    ('bookmark', 'chore', 20, 'reading'),
    ('bone', 'chore', 25, 'pet'),
    ('shovel', 'chore', 10, 'snow'),
    ('bat', 'chore', 15, 'outside'),
    ('mallet', 'chore', 15, 'wood'),
    ('duckhammer', 'chore', 15, 'bath'),
    ('pillowmace', 'chore', 15, 'sleep'),
    ('rattle', 'chore', 15, 'dry'),
    ('butterknife', 'chore', 15, 'breakfast'),
    ('whisk', 'chore', 15, 'dinner'),
    ('baguette', 'chore', 15, 'lunchmade'),
    ('hockey', 'chore', 15, 'basketball'),
    ('crossing', 'chore', 20, 'bus'),
    ('wrench', 'chore', 10, 'repair'),
    ('iron', 'chore', 15, 'shirts'),
    ('bottle', 'chore', 10, 'babysit'),
    ('foamfinger', 'chore', 15, 'helping')
  ) as rules(key, mode, goal, chore)
$$;

-- ---------- achievements ----------
create or replace function private.sync_kid_rewards(p_kid uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stats jsonb := private.kid_stats(p_kid);
  fresh jsonb;
  chore_count integer;
  weapon_total integer := (select count(*)::integer from private.weapon_rules());
  monster_total integer := cardinality(private.monster_kinds());
  streak_best integer := greatest(coalesce((stats->>'streak')::integer, 0), coalesce((stats->>'bestStreak')::integer, 0));
begin
  with earned as (
    select 'weapon'::text as kind, rule.key
    from private.weapon_rules() rule
    where private.weapon_value(rule.key, stats) >= rule.goal
    union all
    select 'achievement', item.key
    from (
      values
        ('first', 1, coalesce((stats->>'battles')::integer, 0)),
        ('hunter', 10, coalesce((stats->>'battles')::integer, 0)),
        ('legend', 50, coalesce((stats->>'battles')::integer, 0)),
        ('fame', 100, coalesce((stats->>'battles')::integer, 0)),
        ('coins100', 100, coalesce((stats->>'coins')::integer, 0)),
        ('coins500', 500, coalesce((stats->>'coins')::integer, 0)),
        ('coins1000', 1000, coalesce((stats->>'coins')::integer, 0)),
        ('bedboss', 7, coalesce((stats->'chores'->>'bed')::integer, 0)),
        ('smile', 14, coalesce((stats->'chores'->>'teeth')::integer, 0)),
        ('bookworm', 10, coalesce((stats->'chores'->>'reading')::integer, 0)),
        ('socks', 10, coalesce((stats->'chores'->>'laundry')::integer, 0)),
        ('petpal', 10, coalesce((stats->'chores'->>'pet')::integer, 0)),
        ('suds', 15, coalesce((stats->'chores'->>'dishes')::integer, 0)),
        ('snowday', 5, coalesce((stats->'chores'->>'snow')::integer, 0)),
        ('freshair', 10, coalesce((stats->'chores'->>'outside')::integer, 0)),
        ('firekeeper', 10, coalesce((stats->'chores'->>'wood')::integer, 0)),
        ('squeaky', 10, coalesce((stats->'chores'->>'bath')::integer, 0)),
        ('dreams', 7, coalesce((stats->'chores'->>'sleep')::integer, 0)),
        ('drynight', 7, coalesce((stats->'chores'->>'dry')::integer, 0)),
        ('breakfast', 10, coalesce((stats->'chores'->>'breakfast')::integer, 0)),
        ('chef', 10, coalesce((stats->'chores'->>'dinner')::integer, 0)),
        ('lunchhero', 10, coalesce((stats->'chores'->>'lunchmade')::integer, 0)),
        ('baller', 10, coalesce((stats->'chores'->>'basketball')::integer, 0)),
        ('ontime', 20, coalesce((stats->'chores'->>'bus')::integer, 0)),
        ('handy', 5, coalesce((stats->'chores'->>'repair')::integer, 0)),
        ('neat', 10, coalesce((stats->'chores'->>'shirts')::integer, 0)),
        ('sibling', 10, coalesce((stats->'chores'->>'babysit')::integer, 0)),
        ('helper', 10, coalesce((stats->'chores'->>'helping')::integer, 0)),
        ('early', 1, coalesce((stats->>'earlyBird')::integer, 0)),
        ('week', 7, streak_best),
        ('month', 30, streak_best),
        ('arsenal', 5, private.unlocked_weapon_count(stats)),
        ('armory', weapon_total, private.unlocked_weapon_count(stats)),
        ('encyclopedia', monster_total, (
          select count(*)::integer
          from unnest(private.monster_kinds()) as kind
          where coalesce((stats->'chores'->>kind)::integer, 0) > 0
        ))
    ) as item(key, goal, value)
    where item.value >= item.goal
  ),
  inserted as (
    insert into public.kid_rewards (kid_id, kind, key)
    select p_kid, earned.kind, earned.key
    from earned
    on conflict do nothing
    returning kind, key
  )
  select jsonb_build_object(
    'achievements', coalesce((select jsonb_agg(key) from inserted where kind = 'achievement'), '[]'::jsonb),
    'weapons', coalesce((select jsonb_agg(key) from inserted where kind = 'weapon'), '[]'::jsonb)
  )
  into fresh;
  return fresh;
end;
$$;

-- ---------- arena settings, ages, runs ----------
alter table public.households add column if not exists arena_entry integer not null default 2;
alter table public.households add column if not exists arena_per_kill integer not null default 1;
alter table public.households drop constraint if exists households_arena_entry_check;
alter table public.households add constraint households_arena_entry_check check (arena_entry >= 0 and arena_entry <= 1000);
alter table public.households drop constraint if exists households_arena_per_kill_check;
alter table public.households add constraint households_arena_per_kill_check check (arena_per_kill >= 0 and arena_per_kill <= 100);
alter table public.kids add column if not exists birth_date date;

create table if not exists public.arena_runs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  entry integer not null,
  per_kill integer not null,
  kills integer not null default 0,
  coins_won integer not null default 0,
  last_kill_at timestamptz,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);
create index if not exists arena_runs_kid_idx on public.arena_runs (kid_id, started_at desc);
alter table public.arena_runs enable row level security;
drop policy if exists arena_runs_select on public.arena_runs;
create policy arena_runs_select on public.arena_runs
  for select to authenticated
  using (household_id = private.household_id());
revoke all on public.arena_runs from public, anon, authenticated;
grant select on public.arena_runs to authenticated;

-- Ages 3-5 little, 6-8 kid, 9+ big. No birth date falls back to kid.
create or replace function private.arena_level(p_birth date)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_birth is null then 'kid'
    when extract(year from age((now() at time zone 'America/Toronto')::date, p_birth)) <= 5 then 'little'
    when extract(year from age((now() at time zone 'America/Toronto')::date, p_birth)) <= 8 then 'kid'
    else 'big'
  end
$$;

create or replace function private.save_arena_settings(p_entry integer, p_per_kill integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  update public.households
  set arena_entry = least(greatest(coalesce(p_entry, 2), 0), 1000),
      arena_per_kill = least(greatest(coalesce(p_per_kill, 1), 0), 100)
  where id = hid;
end;
$$;

create or replace function private.set_kid_birth_date(p_kid uuid, p_birth date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  if p_birth is not null and (p_birth > (now() at time zone 'America/Toronto')::date or p_birth < date '1990-01-01') then
    raise exception 'pick a real birthday';
  end if;
  update public.kids set birth_date = p_birth where id = p_kid and household_id = hid;
  if not found then
    raise exception 'kid not found';
  end if;
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

-- Each beaten monster pays out. A short cooldown and a cap stop button-mashing for coins.
create or replace function private.kid_arena_kill(p_token text, p_run uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  run public.arena_runs%rowtype;
  child public.kids%rowtype;
  reward integer;
  total integer;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into run from public.arena_runs
  where id = p_run and kid_id = kid and ended_at is null and started_at > now() - interval '3 hours'
  for update;
  if run.id is null or run.kills >= 100 then
    raise exception 'arena run over';
  end if;
  if run.last_kill_at is not null and run.last_kill_at > now() - interval '3 seconds' then
    raise exception 'too fast';
  end if;
  select * into child from public.kids where id = kid for update;
  reward := case when private.is_grounded(child.grounded_until) then 0 else run.per_kill end;
  update public.arena_runs
  set kills = kills + 1, coins_won = coins_won + reward, last_kill_at = now()
  where id = run.id;
  update public.kids set points = points + reward where id = kid returning points into total;
  return jsonb_build_object('points', total, 'kills', run.kills + 1, 'reward', reward);
end;
$$;

create or replace function private.kid_arena_end(p_token text, p_run uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  run public.arena_runs%rowtype;
  kname text;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  update public.arena_runs set ended_at = now()
  where id = p_run and kid_id = kid and ended_at is null
  returning * into run;
  if run.id is null then
    return jsonb_build_object('kills', 0, 'coins_won', 0);
  end if;
  select name into kname from public.kids where id = kid;
  insert into public.activity (household_id, kid_id, body)
  values (
    run.household_id,
    kid,
    kname || ' beat ' || run.kills || ' monster' || case when run.kills = 1 then '' else 's' end
      || ' in the Monster Arena and won ' || run.coins_won || ' coin' || case when run.coins_won = 1 then '' else 's' end || '.'
  );
  return jsonb_build_object('kills', run.kills, 'coins_won', run.coins_won);
end;
$$;

-- ---------- kid snapshot: arena settings and level ----------
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
      'arena_level', private.arena_level(k.birth_date)
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

-- ---------- public wrappers and grants ----------
create or replace function public.save_arena_settings(p_entry integer, p_per_kill integer)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_arena_settings(p_entry, p_per_kill); end $$;

create or replace function public.set_kid_birth_date(p_kid uuid, p_birth date)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.set_kid_birth_date(p_kid, p_birth); end $$;

create or replace function public.kid_arena_start(p_token text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_arena_start(p_token) $$;

create or replace function public.kid_arena_kill(p_token text, p_run uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_arena_kill(p_token, p_run) $$;

create or replace function public.kid_arena_end(p_token text, p_run uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_arena_end(p_token, p_run) $$;

revoke all on function private.arena_level(date) from public, anon, authenticated;
revoke all on function private.save_arena_settings(integer, integer) from public, anon, authenticated;
revoke all on function private.set_kid_birth_date(uuid, date) from public, anon, authenticated;
revoke all on function private.kid_arena_start(text) from public, anon, authenticated;
revoke all on function private.kid_arena_kill(text, uuid) from public, anon, authenticated;
revoke all on function private.kid_arena_end(text, uuid) from public, anon, authenticated;
revoke all on function public.save_arena_settings(integer, integer) from public, anon, authenticated;
revoke all on function public.set_kid_birth_date(uuid, date) from public, anon, authenticated;
revoke all on function public.kid_arena_start(text) from public, anon, authenticated;
revoke all on function public.kid_arena_kill(text, uuid) from public, anon, authenticated;
revoke all on function public.kid_arena_end(text, uuid) from public, anon, authenticated;

grant execute on function private.arena_level(date) to anon, authenticated;
grant execute on function private.save_arena_settings(integer, integer) to authenticated;
grant execute on function private.set_kid_birth_date(uuid, date) to authenticated;
grant execute on function private.kid_arena_start(text) to anon, authenticated;
grant execute on function private.kid_arena_kill(text, uuid) to anon, authenticated;
grant execute on function private.kid_arena_end(text, uuid) to anon, authenticated;
grant execute on function public.save_arena_settings(integer, integer) to authenticated;
grant execute on function public.set_kid_birth_date(uuid, date) to authenticated;
grant execute on function public.kid_arena_start(text) to anon, authenticated;
grant execute on function public.kid_arena_kill(text, uuid) to anon, authenticated;
grant execute on function public.kid_arena_end(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
