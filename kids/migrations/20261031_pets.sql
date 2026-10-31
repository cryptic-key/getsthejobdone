-- Companion pets: owned via kid_rewards, equipped on kids.pet, prices per household (default 50).

alter table public.kids add column if not exists pet text;

alter table public.kid_rewards drop constraint if exists kid_rewards_kind_check;
alter table public.kid_rewards
  add constraint kid_rewards_kind_check check (kind in ('achievement', 'weapon', 'pet'));

create table if not exists public.pet_prices (
  household_id uuid not null references public.households (id) on delete cascade,
  pet_key text not null,
  cost integer not null check (cost > 0),
  primary key (household_id, pet_key)
);
alter table public.pet_prices enable row level security;
revoke all on table public.pet_prices from public, anon, authenticated;

drop policy if exists pet_prices_select on public.pet_prices;
create policy pet_prices_select on public.pet_prices
  for select to authenticated
  using (household_id = private.household_id());

create or replace function private.pet_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'puppy','kitten','bunny','hamster','duckling','frog','fox','turtle','penguin','owl',
    'ghost','robot','slime','unicorn','dragon','rock','himalayan','tuxedo','crab','betta',
    'gecko','platypus','shark','whale'
  ]
$$;

create or replace function private.pet_cost(p_household uuid, p_pet text)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  price integer;
begin
  if p_pet is null or not (p_pet = any (private.pet_keys())) then
    raise exception 'unknown pet';
  end if;
  select cost into price
  from public.pet_prices
  where household_id = p_household and pet_key = p_pet;
  return coalesce(price, 50);
end;
$$;

create or replace function private.save_pet_price(p_pet text, p_cost integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  cost integer := greatest(1, coalesce(p_cost, 50));
begin
  if p_pet is null or not (p_pet = any (private.pet_keys())) then
    raise exception 'unknown pet';
  end if;
  insert into public.pet_prices (household_id, pet_key, cost)
  values (hid, p_pet, cost)
  on conflict (household_id, pet_key) do update set cost = excluded.cost;
end;
$$;

create or replace function private.kid_buy_pet(p_token text, p_pet text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  price integer;
  pname text;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  if p_pet is null or not (p_pet = any (private.pet_keys())) then
    raise exception 'unknown pet';
  end if;
  select * into child from public.kids where id = kid;
  if exists (
    select 1 from public.kid_rewards
    where kid_id = kid and kind = 'pet' and key = p_pet
  ) then
    raise exception 'already owned';
  end if;
  price := private.pet_cost(child.household_id, p_pet);
  if child.points < price then
    raise exception 'not enough points';
  end if;
  update public.kids
  set points = points - price, pet = p_pet
  where id = kid;
  insert into public.kid_rewards (kid_id, kind, key)
  values (kid, 'pet', p_pet)
  on conflict do nothing;
  pname := initcap(replace(p_pet, '_', ' '));
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' adopted a ' || pname || ' for ' || price || ' coins.');
end;
$$;

create or replace function private.kid_set_pet(p_token text, p_pet text)
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
  if p_pet is null or btrim(p_pet) = '' then
    update public.kids set pet = null where id = kid;
    return;
  end if;
  if not (p_pet = any (private.pet_keys())) then
    raise exception 'unknown pet';
  end if;
  if not exists (
    select 1 from public.kid_rewards
    where kid_id = kid and kind = 'pet' and key = p_pet
  ) then
    raise exception 'pet locked';
  end if;
  update public.kids set pet = p_pet where id = kid;
end;
$$;

create or replace function public.save_pet_price(p_pet text, p_cost integer)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_pet_price(p_pet, p_cost); end $$;

create or replace function public.kid_buy_pet(p_token text, p_pet text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_buy_pet(p_token, p_pet); end $$;

create or replace function public.kid_set_pet(p_token text, p_pet text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_set_pet(p_token, p_pet); end $$;

revoke all on function private.pet_keys() from public, anon, authenticated;
revoke all on function private.pet_cost(uuid, text) from public, anon, authenticated;
revoke all on function private.save_pet_price(text, integer) from public, anon, authenticated;
revoke all on function private.kid_buy_pet(text, text) from public, anon, authenticated;
revoke all on function private.kid_set_pet(text, text) from public, anon, authenticated;
revoke all on function public.save_pet_price(text, integer) from public, anon, authenticated;
revoke all on function public.kid_buy_pet(text, text) from public, anon, authenticated;
revoke all on function public.kid_set_pet(text, text) from public, anon, authenticated;

grant execute on function private.pet_keys() to authenticated;
grant execute on function private.pet_cost(uuid, text) to authenticated;
grant execute on function private.save_pet_price(text, integer) to authenticated;
grant execute on function private.kid_buy_pet(text, text) to anon, authenticated;
grant execute on function private.kid_set_pet(text, text) to anon, authenticated;
grant execute on function public.save_pet_price(text, integer) to authenticated;
grant execute on function public.kid_buy_pet(text, text) to anon, authenticated;
grant execute on function public.kid_set_pet(text, text) to anon, authenticated;
