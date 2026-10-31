-- Allow parents to edit schedule section name and hours.

create or replace function private.save_chore_section(p_id uuid, p_title text, p_start text, p_end text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  title text := btrim(coalesce(p_title, ''));
begin
  if title = '' then
    raise exception 'section name required';
  end if;
  update public.chore_sections
  set
    title = title,
    start_minute = private.parse_clock(p_start),
    end_minute = private.parse_clock(p_end)
  where id = p_id and household_id = hid;
  if not found then
    raise exception 'section not found';
  end if;
end;
$$;

create or replace function public.save_chore_section(p_id uuid, p_title text, p_start text, p_end text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_chore_section(p_id, p_title, p_start, p_end); end $$;

revoke all on function private.save_chore_section(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.save_chore_section(uuid, text, text, text) from public, anon, authenticated;
grant execute on function private.save_chore_section(uuid, text, text, text) to authenticated;
grant execute on function public.save_chore_section(uuid, text, text, text) to authenticated;

notify pgrst, 'reload schema';
