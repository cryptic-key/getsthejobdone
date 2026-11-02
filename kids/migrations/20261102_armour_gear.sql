-- Armour: helmets (head slot) and body armour (body slot).
-- Owned via kid_rewards (kind 'gear'), equipped on kids.helmet / kids.armor, prices per household
-- (defaults from the catalog below). Each piece grants one arena special per run; the only special that
-- touches coins (Lucky Coin) is paid by kid_arena_lucky, which checks the equipped gear on the server.
-- Keep the catalog in sync with kids/gear.js.

alter table public.kids add column if not exists helmet text;
alter table public.kids add column if not exists armor text;

alter table public.kid_rewards drop constraint if exists kid_rewards_kind_check;
alter table public.kid_rewards
  add constraint kid_rewards_kind_check check (kind in ('achievement', 'weapon', 'pet', 'gear'));

alter table public.arena_runs add column if not exists lucky_used boolean not null default false;

create table if not exists public.gear_prices (
  household_id uuid not null references public.households (id) on delete cascade,
  gear_key text not null,
  cost integer not null check (cost > 0),
  primary key (household_id, gear_key)
);
alter table public.gear_prices enable row level security;
revoke all on table public.gear_prices from public, anon, authenticated;
grant select on public.gear_prices to authenticated;

drop policy if exists gear_prices_select on public.gear_prices;
create policy gear_prices_select on public.gear_prices
  for select to authenticated
  using (household_id = private.household_id());

create or replace function private.gear_catalog()
returns table (gear_key text, slot text, ability text, price integer)
language sql
immutable
set search_path = ''
as $$
  values
    ('cap', 'head', 'sniff', 60),
    ('flowercrown', 'head', 'heal', 100),
    ('knighthelm', 'head', 'shield', 120),
    ('wizardhat', 'head', 'fifty', 150),
    ('vikinghelm', 'head', 'power', 180),
    ('goldcrown', 'head', 'lucky', 250),
    ('vest', 'body', 'lucky', 60),
    ('cape', 'body', 'heal', 120),
    ('chainmail', 'body', 'shield', 150),
    ('starrobe', 'body', 'swap', 180),
    ('plate', 'body', 'power', 250)
$$;

create or replace function private.gear_slot(p_gear text)
returns text
language sql
immutable
set search_path = ''
as $$
  select c.slot from private.gear_catalog() c where c.gear_key = p_gear
$$;

create or replace function private.gear_cost(p_household uuid, p_gear text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  price integer;
  base integer;
begin
  select c.price into base from private.gear_catalog() c where c.gear_key = p_gear;
  if base is null then
    raise exception 'unknown gear';
  end if;
  select cost into price from public.gear_prices where household_id = p_household and gear_key = p_gear;
  return coalesce(price, base);
end;
$$;

create or replace function private.save_gear_price(p_gear text, p_cost integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  if private.gear_slot(p_gear) is null then
    raise exception 'unknown gear';
  end if;
  insert into public.gear_prices (household_id, gear_key, cost)
  values (hid, p_gear, greatest(1, coalesce(p_cost, 1)))
  on conflict (household_id, gear_key) do update set cost = excluded.cost;
end;
$$;

-- Owned gear, what is equipped, and this household's prices.
create or replace function private.kid_gear(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid;
  return jsonb_build_object(
    'head', child.helmet,
    'body', child.armor,
    'owned', coalesce((
      select jsonb_agg(r.key order by r.key)
      from public.kid_rewards r
      where r.kid_id = kid and r.kind = 'gear'
    ), '[]'::jsonb),
    'prices', (
      select jsonb_object_agg(c.gear_key, private.gear_cost(child.household_id, c.gear_key))
      from private.gear_catalog() c
    )
  );
end;
$$;

-- Buy a piece of gear and put it on.
create or replace function private.kid_buy_gear(p_token text, p_gear text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  slot text := private.gear_slot(p_gear);
  price integer;
  left_points integer;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  if slot is null then
    raise exception 'unknown gear';
  end if;
  select * into child from public.kids where id = kid for update;
  if exists (select 1 from public.kid_rewards where kid_id = kid and kind = 'gear' and key = p_gear) then
    raise exception 'already owned';
  end if;
  price := private.gear_cost(child.household_id, p_gear);
  if child.points < price then
    raise exception 'not enough points';
  end if;
  update public.kids
  set points = points - price,
      helmet = case when slot = 'head' then p_gear else helmet end,
      armor = case when slot = 'body' then p_gear else armor end
  where id = kid
  returning points into left_points;
  insert into public.kid_rewards (kid_id, kind, key) values (kid, 'gear', p_gear) on conflict do nothing;
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' bought the ' || initcap(p_gear) || ' for ' || price || ' coins.');
  return jsonb_build_object('points', left_points, 'slot', slot, 'gear', p_gear);
end;
$$;

-- Equip an owned piece in its slot, or take a slot off (p_gear null).
create or replace function private.kid_set_gear(p_token text, p_slot text, p_gear text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  if p_slot not in ('head', 'body') then
    raise exception 'unknown slot';
  end if;
  if p_gear is not null and btrim(p_gear) <> '' then
    if private.gear_slot(p_gear) is distinct from p_slot then
      raise exception 'wrong slot';
    end if;
    if not exists (select 1 from public.kid_rewards where kid_id = kid and kind = 'gear' and key = p_gear) then
      raise exception 'gear locked';
    end if;
  else
    p_gear := null;
  end if;
  if p_slot = 'head' then
    update public.kids set helmet = p_gear where id = kid;
  else
    update public.kids set armor = p_gear where id = kid;
  end if;
end;
$$;

-- Lucky Coin special: +1 coin once per arena run, only if the equipped helmet or armour has Lucky Coin.
create or replace function private.kid_arena_lucky(p_token text, p_run uuid)
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
  if run.id is null or run.lucky_used or run.kills < 1 then
    raise exception 'no lucky coin';
  end if;
  select * into child from public.kids where id = kid for update;
  if not exists (
    select 1 from private.gear_catalog() c
    where c.ability = 'lucky' and c.gear_key in (child.helmet, child.armor)
  ) then
    raise exception 'no lucky coin';
  end if;
  reward := case when private.is_grounded(child.grounded_until) then 0 else 1 end;
  update public.arena_runs set lucky_used = true, coins_won = coins_won + reward where id = run.id;
  update public.kids set points = points + reward where id = kid returning points into total;
  return jsonb_build_object('points', total, 'reward', reward);
end;
$$;

create or replace function public.save_gear_price(p_gear text, p_cost integer)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_gear_price(p_gear, p_cost); end $$;

create or replace function public.kid_gear(p_token text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_gear(p_token) $$;

create or replace function public.kid_buy_gear(p_token text, p_gear text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_buy_gear(p_token, p_gear) $$;

create or replace function public.kid_set_gear(p_token text, p_slot text, p_gear text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_set_gear(p_token, p_slot, p_gear); end $$;

create or replace function public.kid_arena_lucky(p_token text, p_run uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_arena_lucky(p_token, p_run) $$;

revoke all on function private.gear_catalog() from public, anon, authenticated;
revoke all on function private.gear_slot(text) from public, anon, authenticated;
revoke all on function private.gear_cost(uuid, text) from public, anon, authenticated;
revoke all on function private.save_gear_price(text, integer) from public, anon, authenticated;
revoke all on function private.kid_gear(text) from public, anon, authenticated;
revoke all on function private.kid_buy_gear(text, text) from public, anon, authenticated;
revoke all on function private.kid_set_gear(text, text, text) from public, anon, authenticated;
revoke all on function private.kid_arena_lucky(text, uuid) from public, anon, authenticated;
revoke all on function public.save_gear_price(text, integer) from public, anon, authenticated;
revoke all on function public.kid_gear(text) from public, anon, authenticated;
revoke all on function public.kid_buy_gear(text, text) from public, anon, authenticated;
revoke all on function public.kid_set_gear(text, text, text) from public, anon, authenticated;
revoke all on function public.kid_arena_lucky(text, uuid) from public, anon, authenticated;

grant execute on function private.gear_catalog() to anon, authenticated;
grant execute on function private.gear_slot(text) to anon, authenticated;
grant execute on function private.gear_cost(uuid, text) to anon, authenticated;
grant execute on function private.save_gear_price(text, integer) to authenticated;
grant execute on function private.kid_gear(text) to anon, authenticated;
grant execute on function private.kid_buy_gear(text, text) to anon, authenticated;
grant execute on function private.kid_set_gear(text, text, text) to anon, authenticated;
grant execute on function private.kid_arena_lucky(text, uuid) to anon, authenticated;
grant execute on function public.save_gear_price(text, integer) to authenticated;
grant execute on function public.kid_gear(text) to anon, authenticated;
grant execute on function public.kid_buy_gear(text, text) to anon, authenticated;
grant execute on function public.kid_set_gear(text, text, text) to anon, authenticated;
grant execute on function public.kid_arena_lucky(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
