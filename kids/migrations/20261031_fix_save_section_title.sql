-- Fix save_chore_section: local variable "title" collided with the column name.

create or replace function private.save_chore_section(p_id uuid, p_title text, p_start_minute integer, p_end_minute integer)
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
begin
  if section_title = '' then
    raise exception 'section name required';
  end if;
  update public.chore_sections
  set
    title = section_title,
    start_minute = start_m,
    end_minute = end_m
  where id = p_id and household_id = hid;
  if not found then
    raise exception 'section not found';
  end if;
end;
$$;

notify pgrst, 'reload schema';
