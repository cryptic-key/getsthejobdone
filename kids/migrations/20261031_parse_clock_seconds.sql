-- iOS Safari time inputs submit HH:MM:SS; accept optional seconds.

create or replace function private.parse_clock(p_clock text)
returns integer
language plpgsql
immutable
set search_path = ''
as $$
declare
  raw text := coalesce(nullif(btrim(p_clock), ''), '00:00');
  hh integer;
  mm integer;
begin
  -- Strip fractional seconds if present, then optional whole seconds.
  raw := split_part(raw, '.', 1);
  if raw !~ '^[0-2]?[0-9]:[0-5][0-9](:[0-5][0-9])?$' then
    raise exception 'use a time like 07:30';
  end if;
  hh := split_part(raw, ':', 1)::integer;
  mm := split_part(raw, ':', 2)::integer;
  if hh < 0 or hh > 23 or mm < 0 or mm > 59 then
    raise exception 'use a time like 07:30';
  end if;
  return hh * 60 + mm;
end;
$$;
