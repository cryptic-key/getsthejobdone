-- Parents can rename a daily or bonus task from the Tasks page.
-- The template is renamed, and so are today's open or waiting copies. Approved history keeps the old name.

create or replace function private.rename_chore(p_id uuid, p_title text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  ttl text := btrim(coalesce(p_title, ''));
begin
  if ttl = '' then
    raise exception 'chore required';
  end if;
  if length(ttl) > 80 then
    raise exception 'name too long';
  end if;
  update public.chore_templates
  set title = ttl
  where id = p_id and household_id = hid and kind in ('daily', 'special');
  if not found then
    raise exception 'chore not found';
  end if;
  update public.chores
  set title = ttl
  where template_id = p_id and household_id = hid and status in ('open', 'submitted');
end;
$$;

create or replace function public.rename_chore(p_id uuid, p_title text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.rename_chore(p_id, p_title); end $$;

revoke all on function private.rename_chore(uuid, text) from public, anon, authenticated;
revoke all on function public.rename_chore(uuid, text) from public, anon, authenticated;
grant execute on function private.rename_chore(uuid, text) to authenticated;
grant execute on function public.rename_chore(uuid, text) to authenticated;

notify pgrst, 'reload schema';
