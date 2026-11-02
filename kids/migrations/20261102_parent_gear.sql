-- Parents keep every helmet and piece of armour unlocked (no purchase); they just pick what to wear.
alter table public.parents add column if not exists helmet text;
alter table public.parents add column if not exists armor text;

create or replace function private.parent_set_gear(p_slot text, p_gear text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  gear text := nullif(btrim(coalesce(p_gear, '')), '');
begin
  if p_slot not in ('head', 'body') then
    raise exception 'unknown slot';
  end if;
  if gear is not null and private.gear_slot(gear) is distinct from p_slot then
    raise exception 'wrong slot';
  end if;
  if p_slot = 'head' then
    update public.parents set helmet = gear where user_id = auth.uid() and household_id = hid;
  else
    update public.parents set armor = gear where user_id = auth.uid() and household_id = hid;
  end if;
  if not found then
    raise exception 'not a parent';
  end if;
end;
$$;

create or replace function public.parent_set_gear(p_slot text, p_gear text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.parent_set_gear(p_slot, p_gear); end $$;

revoke all on function private.parent_set_gear(text, text) from public, anon, authenticated;
revoke all on function public.parent_set_gear(text, text) from public, anon, authenticated;
grant execute on function private.parent_set_gear(text, text) to authenticated;
grant execute on function public.parent_set_gear(text, text) to authenticated;

notify pgrst, 'reload schema';
