-- A grounding that runs out on the clock frees the kid the same way the coin goal and Lift do:
-- three hearts back, cage progress cleared, and a "free" entry in the log.
create or replace function private.ensure_daily(p_household uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Toronto')::date;
  expired uuid;
begin
  for expired in
    select id from public.kids
    where household_id = p_household and grounded_until is not null and grounded_until <= now()
    for update skip locked
  loop
    perform private.free_kid(expired);
  end loop;
  insert into public.chores (household_id, kid_id, template_id, title, points, sprite, chore_day)
  select k.household_id, k.id, t.id, t.title, t.points, t.sprite, today
  from public.kids k
  join public.chore_templates t on t.household_id = k.household_id and t.kind = 'daily' and t.active
  where k.household_id = p_household
  on conflict (template_id, kid_id, chore_day) do nothing;
end;
$$;
