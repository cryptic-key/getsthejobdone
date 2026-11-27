-- Several families can share this project: the door screen (list_players, list_kids) now shows one family only.
-- No code (what /kids sends) = the first family, so /kids behaves exactly as before.
-- A code (e.g. 'longofam' from /longofam) = the family with that households.code.

create or replace function private.door_household(p_code text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select h.id
  from public.households h
  where case
    when nullif(btrim(coalesce(p_code, '')), '') is null
      then h.id = (select first.id from public.households first order by first.created_at, first.id limit 1)
    else h.code = btrim(p_code)
  end
  limit 1
$$;

revoke all on function private.door_household(text) from public, anon, authenticated;

begin;

drop function if exists public.list_players();
drop function if exists private.list_players();

create or replace function private.list_players(p_code text default '')
returns table (id uuid, name text, color text, kind text, has_pin boolean, hero text, weapon text, pet text)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.name, q.color, q.kind, q.has_pin, q.hero, q.weapon, q.pet
  from (
    select k.id, k.name, k.color, 'kid'::text as kind, true as has_pin, k.hero, k.weapon, k.pet, k.created_at, 0 as grp
    from public.kids k
    where k.household_id = private.door_household(p_code)
    union all
    select p.id, p.name, p.color, 'parent'::text,
      exists (select 1 from private.parent_pins pins where pins.parent_id = p.id),
      p.hero,
      p.weapon,
      p.pet,
      p.created_at, 1
    from public.parents p
    where p.household_id = private.door_household(p_code)
  ) q
  order by q.grp, q.created_at
$$;

create or replace function public.list_players(p_code text default '')
returns table (id uuid, name text, color text, kind text, has_pin boolean, hero text, weapon text, pet text)
language sql
stable
security definer
set search_path = ''
as $$ select * from private.list_players(p_code) $$;

revoke all on function private.list_players(text) from public, anon, authenticated;
revoke all on function public.list_players(text) from public, anon, authenticated;
grant execute on function private.door_household(text) to anon, authenticated;
grant execute on function private.list_players(text) to anon, authenticated;
grant execute on function public.list_players(text) to anon, authenticated;

create or replace function private.list_kids(p_code text)
returns table (id uuid, name text, color text)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.name, k.color
  from public.kids k
  where k.household_id = private.door_household(p_code)
  order by k.created_at
$$;

commit;

notify pgrst, 'reload schema';
