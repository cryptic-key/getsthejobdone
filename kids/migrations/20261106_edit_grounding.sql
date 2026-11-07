-- Parents can edit an active grounding: change the end time and set cage coin progress.
-- Matching the approve path, reaching the cage goal frees the kid.

create or replace function private.edit_grounding(
  p_kid uuid,
  p_until timestamptz,
  p_progress integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  child public.kids%rowtype;
  goal integer;
  next_progress integer := greatest(coalesce(p_progress, 0), 0);
begin
  if p_until is null then
    raise exception 'pick an end time';
  end if;
  if p_until <= now() then
    raise exception 'pick an end time in the future';
  end if;
  select * into child from public.kids where id = p_kid and household_id = hid;
  if child.id is null then
    raise exception 'kid not found';
  end if;
  if not private.is_grounded(child.grounded_until) then
    raise exception 'that hero is not grounded';
  end if;
  select unground_points into goal from public.households where id = hid;
  update public.kids
  set grounded_until = p_until,
      ground_progress = next_progress
  where id = child.id;
  insert into public.activity (household_id, kid_id, body)
  values (
    hid,
    child.id,
    child.name || '''s cage was updated: until '
      || to_char(p_until, 'Dy Mon DD HH12:MI AM')
      || ', cage coins ' || next_progress || '.'
  );
  if coalesce(goal, 0) > 0 and next_progress >= goal then
    perform private.free_kid(child.id);
    return true;
  end if;
  return false;
end;
$$;

create or replace function public.edit_grounding(
  p_kid uuid,
  p_until timestamptz,
  p_progress integer
)
returns boolean
language sql
security invoker
set search_path = ''
as $$
  select private.edit_grounding(p_kid, p_until, p_progress)
$$;

revoke all on function private.edit_grounding(uuid, timestamptz, integer) from public, anon, authenticated;
revoke all on function public.edit_grounding(uuid, timestamptz, integer) from public, anon, authenticated;
grant execute on function private.edit_grounding(uuid, timestamptz, integer) to authenticated;
grant execute on function public.edit_grounding(uuid, timestamptz, integer) to authenticated;

notify pgrst, 'reload schema';
