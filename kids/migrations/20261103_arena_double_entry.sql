-- Arena entry doubles each attempt today (base, base*2, base*4, ...), then resets next Toronto day.

create or replace function private.arena_next_fee(p_kid uuid)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  base integer := 2;
  attempts integer := 0;
  today date := (now() at time zone 'America/Toronto')::date;
  shift integer;
  fee bigint;
begin
  if p_kid is null then
    return 2;
  end if;
  select coalesce(h.arena_entry, 2) into base
  from public.kids k
  join public.households h on h.id = k.household_id
  where k.id = p_kid;
  base := least(greatest(coalesce(base, 2), 0), 1000);
  select count(*)::integer into attempts
  from public.arena_runs r
  where r.kid_id = p_kid
    and (r.started_at at time zone 'America/Toronto')::date = today;
  attempts := greatest(coalesce(attempts, 0), 0);
  -- Cap the doubling so fee stays in a sane integer range (2^20 * 1000).
  shift := least(attempts, 20);
  fee := base::bigint * (1::bigint << shift);
  if fee > 1000000 then
    return 1000000;
  end if;
  return fee::integer;
end;
$$;

revoke all on function private.arena_next_fee(uuid) from public, anon, authenticated;
grant execute on function private.arena_next_fee(uuid) to anon, authenticated;

create or replace function private.kid_arena_start(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  fee integer;
  per integer;
  run_id uuid;
  left_points integer;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid for update;
  if private.is_grounded(child.grounded_until) then
    raise exception 'grounded';
  end if;
  if private.priority_open(kid) then
    raise exception 'priority first';
  end if;
  select arena_per_kill into per from public.households where id = child.household_id;
  fee := private.arena_next_fee(kid);
  per := coalesce(per, 1);
  if child.points < fee then
    raise exception 'not enough coins';
  end if;
  update public.arena_runs set ended_at = now() where kid_id = kid and ended_at is null;
  update public.kids set points = points - fee where id = kid returning points into left_points;
  insert into public.arena_runs (household_id, kid_id, entry, per_kill)
  values (child.household_id, kid, fee, per)
  returning id into run_id;
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' paid ' || fee || ' coins to enter the Monster Arena.');
  return jsonb_build_object(
    'run_id', run_id,
    'entry', fee,
    'per_kill', per,
    'points', left_points,
    'level', private.arena_level(child.birth_date),
    'next_entry', private.arena_next_fee(kid)
  );
end;
$$;

-- Snapshot shows the next fee for this kid so the lobby matches what start will charge.
do $do$
declare
  def text := pg_get_functiondef('private.kid_snapshot(text)'::regprocedure);
begin
  if def like '%arena_next_entry%' then
    return;
  end if;
  if def like '%''arena_entry'', h.arena_entry,%' then
    def := replace(
      def,
      '''arena_entry'', h.arena_entry,' || chr(10) || '      ''arena_per_kill'', h.arena_per_kill',
      '''arena_entry'', h.arena_entry,' || chr(10) || '      ''arena_per_kill'', h.arena_per_kill,' || chr(10) || '      ''arena_next_entry'', private.arena_next_fee(k.id)'
    );
  end if;
  if def not like '%arena_next_entry%' then
    raise exception 'kid_snapshot arena_next_entry patch did not match';
  end if;
  execute def;
end
$do$;

notify pgrst, 'reload schema';
