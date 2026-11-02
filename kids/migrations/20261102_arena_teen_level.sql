-- Ages 3-5 little, 6-8 kid, 9-12 big, 13+ teen. No birth date falls back to kid.
create or replace function private.arena_level(p_birth date)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when p_birth is null then 'kid'
    when extract(year from age((now() at time zone 'America/Toronto')::date, p_birth)) <= 5 then 'little'
    when extract(year from age((now() at time zone 'America/Toronto')::date, p_birth)) <= 8 then 'kid'
    when extract(year from age((now() at time zone 'America/Toronto')::date, p_birth)) <= 12 then 'big'
    else 'teen'
  end
$$;
