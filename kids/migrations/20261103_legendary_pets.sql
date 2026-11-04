-- Legendary pets with special effects. Keep in sync with kids/pets.js.
-- New keys are allowed, and these have higher default prices (households can still change them).

create or replace function private.pet_keys()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'puppy','kitten','bunny','hamster','duckling','frog','fox','turtle','penguin','owl',
    'ghost','robot','slime','unicorn','dragon','rock','himalayan','tuxedo','crab','betta',
    'gecko','platypus','shark','whale',
    'rainbowshark','phoenix','galaxycat','stormpup','glowjelly'
  ]
$$;

create or replace function private.pet_default_cost(p_pet text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_pet
    when 'rainbowshark' then 300
    when 'phoenix' then 300
    when 'galaxycat' then 250
    when 'stormpup' then 250
    when 'glowjelly' then 200
    else 50
  end
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
  return coalesce(price, private.pet_default_cost(p_pet));
end;
$$;

revoke all on function private.pet_default_cost(text) from public, anon, authenticated;
grant execute on function private.pet_default_cost(text) to authenticated;

notify pgrst, 'reload schema';
