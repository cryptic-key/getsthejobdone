-- Parents can equip any pet on My Hero (all unlocked). Pets show on the door roster and parade.

alter table public.parents add column if not exists pet text;

drop function if exists public.list_players();
drop function if exists private.list_players();

create or replace function private.list_players()
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
    union all
    select p.id, p.name, p.color, 'parent'::text,
      exists (select 1 from private.parent_pins pins where pins.parent_id = p.id),
      p.hero,
      p.weapon,
      p.pet,
      p.created_at, 1
    from public.parents p
  ) q
  order by q.grp, q.created_at
$$;

create or replace function public.list_players()
returns table (id uuid, name text, color text, kind text, has_pin boolean, hero text, weapon text, pet text)
language sql security invoker set search_path = ''
as $$ select * from private.list_players() $$;

create or replace function private.parent_set_pet(p_pet text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  pid uuid;
  chosen text := nullif(btrim(coalesce(p_pet, '')), '');
begin
  select id into pid from public.parents where user_id = auth.uid() and household_id = hid;
  if pid is null then
    raise exception 'not a parent';
  end if;
  if chosen is not null and not (chosen = any (private.pet_keys())) then
    raise exception 'unknown pet';
  end if;
  update public.parents set pet = chosen where id = pid;
end;
$$;

create or replace function public.parent_set_pet(p_pet text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.parent_set_pet(p_pet); end $$;

revoke all on function private.list_players() from public, anon, authenticated;
revoke all on function public.list_players() from public, anon, authenticated;
revoke all on function private.parent_set_pet(text) from public, anon, authenticated;
revoke all on function public.parent_set_pet(text) from public, anon, authenticated;

grant execute on function private.list_players() to anon, authenticated;
grant execute on function public.list_players() to anon, authenticated;
grant execute on function private.parent_set_pet(text) to authenticated;
grant execute on function public.parent_set_pet(text) to authenticated;

notify pgrst, 'reload schema';
