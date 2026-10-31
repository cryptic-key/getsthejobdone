-- Save schedule hours as minute integers so iOS time strings cannot break saves.
-- Also make parse_clock accept seconds and am/pm leftovers.

create or replace function private.parse_clock(p_clock text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  raw text := lower(coalesce(nullif(btrim(p_clock), ''), '00:00'));
  hh integer;
  mm integer;
  ampm text;
begin
  raw := regexp_replace(raw, '\.[0-9]+$', '');
  ampm := substring(raw from '(am|pm)');
  raw := regexp_replace(raw, '[^0-9:]+', ' ', 'g');
  raw := btrim(raw);
  if raw ~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$' then
    hh := split_part(raw, ':', 1)::integer;
    mm := split_part(raw, ':', 2)::integer;
  elsif raw ~ '^[0-9]{1,2}\s+[0-9]{2}' then
    hh := split_part(raw, ' ', 1)::integer;
    mm := split_part(raw, ' ', 2)::integer;
  else
    raise exception 'use a time like 07:30';
  end if;
  if ampm = 'pm' and hh < 12 then
    hh := hh + 12;
  elsif ampm = 'am' and hh = 12 then
    hh := 0;
  end if;
  if hh < 0 or hh > 23 or mm < 0 or mm > 59 then
    raise exception 'use a time like 07:30';
  end if;
  return hh * 60 + mm;
end;
$$;

drop function if exists public.save_chore_section(uuid, text, text, text);
drop function if exists private.save_chore_section(uuid, text, text, text);
drop function if exists public.add_chore_section(text, text, text);
drop function if exists private.add_chore_section(text, text, text);

create or replace function private.add_chore_section(p_title text, p_start_minute integer, p_end_minute integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  title text := btrim(p_title);
  sid uuid;
  next_ord integer;
  start_m integer := ((coalesce(p_start_minute, 0) % 1440) + 1440) % 1440;
  end_m integer := ((coalesce(p_end_minute, 0) % 1440) + 1440) % 1440;
begin
  if title is null or title = '' then
    raise exception 'section name required';
  end if;
  select coalesce(max(sort_order), -1) + 1 into next_ord
  from public.chore_sections where household_id = hid;
  insert into public.chore_sections (household_id, title, start_minute, end_minute, sort_order)
  values (hid, title, start_m, end_m, next_ord)
  returning id into sid;
  return sid;
end;
$$;

create or replace function private.save_chore_section(p_id uuid, p_title text, p_start_minute integer, p_end_minute integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  title text := btrim(coalesce(p_title, ''));
  start_m integer := ((coalesce(p_start_minute, 0) % 1440) + 1440) % 1440;
  end_m integer := ((coalesce(p_end_minute, 0) % 1440) + 1440) % 1440;
begin
  if title = '' then
    raise exception 'section name required';
  end if;
  update public.chore_sections
  set
    title = title,
    start_minute = start_m,
    end_minute = end_m
  where id = p_id and household_id = hid;
  if not found then
    raise exception 'section not found';
  end if;
end;
$$;

create or replace function public.add_chore_section(p_title text, p_start_minute integer, p_end_minute integer)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_chore_section(p_title, p_start_minute, p_end_minute) $$;

create or replace function public.save_chore_section(p_id uuid, p_title text, p_start_minute integer, p_end_minute integer)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_chore_section(p_id, p_title, p_start_minute, p_end_minute); end $$;

revoke all on function private.add_chore_section(text, integer, integer) from public, anon, authenticated;
revoke all on function private.save_chore_section(uuid, text, integer, integer) from public, anon, authenticated;
revoke all on function public.add_chore_section(text, integer, integer) from public, anon, authenticated;
revoke all on function public.save_chore_section(uuid, text, integer, integer) from public, anon, authenticated;

grant execute on function private.add_chore_section(text, integer, integer) to authenticated;
grant execute on function private.save_chore_section(uuid, text, integer, integer) to authenticated;
grant execute on function public.add_chore_section(text, integer, integer) to authenticated;
grant execute on function public.save_chore_section(uuid, text, integer, integer) to authenticated;

notify pgrst, 'reload schema';
