-- A kid added later does not get a copy of a first-come bonus task that someone already claimed.

create or replace function private.add_kid(p_name text, p_color text, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  kid uuid;
  chosen text := p_color;
begin
  if nullif(btrim(p_name), '') is null then
    raise exception 'name required';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'pin must be 4 digits';
  end if;
  if chosen not in ('leaf', 'sun', 'sky', 'clay', 'plum', 'teal', 'rose', 'cobalt', 'coral', 'indigo', 'mustard', 'mint') then
    chosen := 'leaf';
  end if;
  insert into public.kids (household_id, name, color)
  values (hid, btrim(p_name), chosen)
  returning id into kid;
  insert into private.kid_pins (kid_id, pin_hash)
  values (kid, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  insert into public.chores (household_id, kid_id, template_id, title, points, sprite)
  select hid, kid, t.id, t.title, t.points, t.sprite
  from public.chore_templates t
  where t.household_id = hid and t.kind = 'special' and t.assignee_id is null
    and not (
      t.first_come and exists (
        select 1 from public.chores c
        where c.template_id = t.id and c.chore_day is null and c.status in ('submitted', 'approved')
      )
    )
  on conflict (template_id, kid_id) where chore_day is null and template_id is not null do nothing;
  insert into public.activity (household_id, kid_id, body)
  values (hid, kid, btrim(p_name) || ' can sign in with a PIN.');
  return kid;
end;
$$;

notify pgrst, 'reload schema';
