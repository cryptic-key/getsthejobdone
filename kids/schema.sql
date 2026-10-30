-- Family chart tables for getsthejobdone.ca/kids.
-- Run this once in the Supabase SQL editor for project zobihpqcvodqhfyxtpzm.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null unique,
  points_per_dollar integer not null default 10 check (points_per_dollar > 0),
  points_per_30 integer not null default 4 check (points_per_30 > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.parents (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.kids (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  color text not null default 'leaf' check (color in ('leaf', 'sun', 'sky', 'clay', 'plum', 'teal')),
  points integer not null default 0 check (points >= 0),
  cash_cents integer not null default 0 check (cash_cents >= 0),
  minutes integer not null default 0 check (minutes >= 0),
  grounded_until timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists private.kid_pins (
  kid_id uuid primary key references public.kids (id) on delete cascade,
  pin_hash text not null
);

create table if not exists private.kid_sessions (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references public.kids (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null
);

create table if not exists public.parent_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  unique (household_id, email)
);

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  title text not null,
  points integer not null default 0 check (points >= 0),
  cash_cents integer not null default 0 check (cash_cents >= 0),
  minutes integer not null default 0 check (minutes >= 0),
  status text not null default 'open' check (status in ('open', 'submitted', 'approved')),
  template_id uuid,
  chore_day date,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.chore_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  points integer not null default 1 check (points >= 0),
  created_at timestamptz not null default now()
);

alter table public.chores add column if not exists template_id uuid references public.chore_templates (id) on delete set null;
alter table public.chores add column if not exists chore_day date;
alter table public.chores add column if not exists approved_at timestamptz;
create unique index if not exists chores_daily_once on public.chores (template_id, kid_id, chore_day);

create or replace function private.stamp_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at := coalesce(new.approved_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists chores_stamp_approved on public.chores;
create trigger chores_stamp_approved
  before update on public.chores
  for each row execute procedure private.stamp_approved();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'chores_template_id_fkey') then
    alter table public.chores
      add constraint chores_template_id_fkey
      foreign key (template_id) references public.chore_templates (id) on delete set null;
  end if;
end $$;

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  cost integer not null check (cost > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  item_id uuid not null references public.shop_items (id) on delete cascade,
  cost integer not null check (cost > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at timestamptz not null default now()
);

create table if not exists public.activity (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  kid_id uuid references public.kids (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.households enable row level security;
alter table public.parents enable row level security;
alter table public.kids enable row level security;
alter table public.parent_invites enable row level security;
alter table public.chores enable row level security;
alter table public.shop_items enable row level security;
alter table public.requests enable row level security;
alter table public.activity enable row level security;
alter table public.chore_templates enable row level security;

create or replace function private.household_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.household_id
  from public.parents p
  where p.user_id = auth.uid()
$$;

create or replace function private.require_household()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  hid := private.household_id();
  if hid is null then
    raise exception 'not a parent';
  end if;
  return hid;
end;
$$;

create or replace function private.kid_from_token(p_token text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.kid_id
  from private.kid_sessions s
  where s.token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
    and s.expires_at > now()
$$;

create or replace function private.is_grounded(p_until timestamptz)
returns boolean
language sql
stable
set search_path = ''
as $$
  select p_until is not null and p_until > now()
$$;

revoke all on function private.household_id() from public;
revoke all on function private.require_household() from public;
revoke all on function private.kid_from_token(text) from public;
revoke all on function private.is_grounded(timestamptz) from public;
grant execute on function private.household_id() to authenticated;
grant execute on function private.require_household() to authenticated;

drop policy if exists households_select on public.households;
create policy households_select on public.households
  for select to authenticated
  using (id = private.household_id());

drop policy if exists households_update on public.households;
create policy households_update on public.households
  for update to authenticated
  using (id = private.household_id())
  with check (id = private.household_id());

drop policy if exists parents_select on public.parents;
create policy parents_select on public.parents
  for select to authenticated
  using (household_id = private.household_id());

drop policy if exists parents_delete on public.parents;
create policy parents_delete on public.parents
  for delete to authenticated
  using (household_id = private.household_id() and user_id <> auth.uid());

drop policy if exists kids_select on public.kids;
create policy kids_select on public.kids
  for select to authenticated
  using (household_id = private.household_id());

drop policy if exists invites_all on public.parent_invites;
create policy invites_all on public.parent_invites
  for all to authenticated
  using (household_id = private.household_id())
  with check (household_id = private.household_id());

drop policy if exists chores_select on public.chores;
create policy chores_select on public.chores
  for select to authenticated
  using (household_id = private.household_id());

drop policy if exists items_select on public.shop_items;
create policy items_select on public.shop_items
  for select to authenticated
  using (household_id = private.household_id());

drop policy if exists requests_select on public.requests;
create policy requests_select on public.requests
  for select to authenticated
  using (household_id = private.household_id());

drop policy if exists activity_select on public.activity;
create policy activity_select on public.activity
  for select to authenticated
  using (household_id = private.household_id());

drop policy if exists templates_select on public.chore_templates;
create policy templates_select on public.chore_templates
  for select to authenticated
  using (household_id = private.household_id());

revoke all on table public.households, public.parents, public.kids, public.parent_invites,
  public.chores, public.chore_templates, public.shop_items, public.requests, public.activity
  from public, anon, authenticated;
grant select on public.households, public.parents, public.kids, public.parent_invites,
  public.chores, public.chore_templates, public.shop_items, public.requests, public.activity to authenticated;
grant delete on public.parents to authenticated;

revoke all on table private.kid_pins, private.kid_sessions from public, anon, authenticated;
alter table private.kid_pins enable row level security;
alter table private.kid_sessions enable row level security;

create or replace function private.handle_new_parent()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  fam text := nullif(btrim(coalesce(meta->>'family_name', '')), '');
  pname text := coalesce(nullif(btrim(coalesce(meta->>'name', '')), ''), 'Parent');
  hid uuid;
begin
  select i.household_id into hid
  from public.parent_invites i
  where lower(i.email) = lower(new.email)
  order by i.created_at desc
  limit 1;

  if hid is not null then
    delete from public.parent_invites i where lower(i.email) = lower(new.email);
  elsif fam is not null then
    insert into public.households (name, code)
    values (fam, encode(extensions.gen_random_bytes(5), 'hex'))
    returning id into hid;
  else
    return new;
  end if;

  insert into public.parents (household_id, user_id, name, email)
  values (hid, new.id, pname, lower(new.email))
  on conflict (user_id) do nothing;

  insert into public.activity (household_id, body)
  values (hid, pname || ' joined as a parent.');

  return new;
end;
$$;

grant usage on schema private to supabase_auth_admin;
grant execute on function private.handle_new_parent() to supabase_auth_admin;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_parent();

create or replace function private.invite_parent(p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  clean text := lower(btrim(p_email));
begin
  if clean !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email required';
  end if;
  if exists (select 1 from public.parents where lower(email) = clean) then
    raise exception 'that email already has an account';
  end if;
  insert into public.parent_invites (household_id, email)
  values (hid, clean)
  on conflict (household_id, email) do nothing;
end;
$$;

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
  if chosen not in ('leaf', 'sun', 'sky', 'clay', 'plum', 'teal') then
    chosen := 'leaf';
  end if;
  insert into public.kids (household_id, name, color)
  values (hid, btrim(p_name), chosen)
  returning id into kid;
  insert into private.kid_pins (kid_id, pin_hash)
  values (kid, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  insert into public.activity (household_id, kid_id, body)
  values (hid, kid, btrim(p_name) || ' can sign in with a PIN.');
  return kid;
end;
$$;

create or replace function private.set_kid_pin(p_kid uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'pin must be 4 digits';
  end if;
  if not exists (select 1 from public.kids where id = p_kid and household_id = hid) then
    raise exception 'kid not found';
  end if;
  update private.kid_pins
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  where kid_id = p_kid;
end;
$$;

create or replace function private.remove_kid(p_kid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  kname text;
begin
  select name into kname from public.kids where id = p_kid and household_id = hid;
  if kname is null then
    raise exception 'kid not found';
  end if;
  delete from public.kids where id = p_kid;
  insert into public.activity (household_id, body)
  values (hid, kname || ' was removed.');
end;
$$;

create or replace function private.remove_parent(p_parent uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  pname text;
begin
  select name into pname
  from public.parents
  where id = p_parent and household_id = hid and user_id <> auth.uid();
  if pname is null then
    raise exception 'parent not found';
  end if;
  delete from public.parents where id = p_parent;
  insert into public.activity (household_id, body)
  values (hid, pname || ' was removed as a parent.');
end;
$$;

create or replace function private.add_chore(p_kid uuid, p_title text, p_points integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  cid uuid;
begin
  if nullif(btrim(p_title), '') is null then
    raise exception 'chore required';
  end if;
  if not exists (select 1 from public.kids where id = p_kid and household_id = hid) then
    raise exception 'kid not found';
  end if;
  insert into public.chores (household_id, kid_id, title, points)
  values (hid, p_kid, btrim(p_title), greatest(coalesce(p_points, 0), 0))
  returning id into cid;
  return cid;
end;
$$;

create or replace function private.approve_chore(p_chore uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  chore public.chores%rowtype;
  child public.kids%rowtype;
begin
  select * into chore
  from public.chores
  where id = p_chore and household_id = hid and status = 'submitted';
  if chore.id is null then
    raise exception 'nothing to approve';
  end if;
  select * into child from public.kids where id = chore.kid_id;
  update public.chores set status = 'approved', approved_at = now() where id = chore.id;
  update public.kids
  set points = points + chore.points,
      cash_cents = cash_cents + chore.cash_cents,
      minutes = case
        when private.is_grounded(grounded_until) then minutes
        else minutes + chore.minutes
      end
  where id = child.id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, child.id, child.name || ' was paid for ' || chore.title || '.');
end;
$$;

create or replace function private.grant_reward(
  p_kid uuid,
  p_points integer,
  p_cash_cents integer,
  p_minutes integer,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  child public.kids%rowtype;
  pts integer := greatest(coalesce(p_points, 0), 0);
  cash integer := greatest(coalesce(p_cash_cents, 0), 0);
  mins integer := greatest(coalesce(p_minutes, 0), 0);
begin
  select * into child from public.kids where id = p_kid and household_id = hid;
  if child.id is null then
    raise exception 'kid not found';
  end if;
  if pts = 0 and cash = 0 and mins = 0 then
    raise exception 'add points, cash, or minutes';
  end if;
  update public.kids
  set points = points + pts,
      cash_cents = cash_cents + cash,
      minutes = case
        when private.is_grounded(grounded_until) then minutes
        else minutes + mins
      end
  where id = child.id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, child.id, child.name || ' got a reward' || coalesce(': ' || nullif(btrim(p_note), ''), '') || '.');
end;
$$;

create or replace function private.ground_kid(
  p_kid uuid,
  p_until timestamptz,
  p_reason text,
  p_clear boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  child public.kids%rowtype;
begin
  if p_until is null or nullif(btrim(p_reason), '') is null then
    raise exception 'pick an end time and a reason';
  end if;
  select * into child from public.kids where id = p_kid and household_id = hid;
  if child.id is null then
    raise exception 'kid not found';
  end if;
  update public.kids
  set grounded_until = p_until,
      minutes = case when coalesce(p_clear, false) then 0 else minutes end
  where id = child.id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, child.id, child.name || ' is grounded until ' || to_char(p_until, 'Dy Mon DD HH12:MI AM') || '. ' || btrim(p_reason));
end;
$$;

create or replace function private.lift_grounding(p_kid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  kname text;
begin
  select name into kname from public.kids where id = p_kid and household_id = hid;
  if kname is null then
    raise exception 'kid not found';
  end if;
  update public.kids set grounded_until = null where id = p_kid;
  insert into public.activity (household_id, kid_id, body)
  values (hid, p_kid, kname || ' is no longer grounded.');
end;
$$;

create or replace function private.save_rates(p_per_dollar integer, p_per_30 integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  update public.households
  set points_per_dollar = greatest(coalesce(p_per_dollar, 10), 1),
      points_per_30 = greatest(coalesce(p_per_30, 4), 1)
  where id = hid;
end;
$$;

create or replace function private.add_item(p_name text, p_cost integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  iid uuid;
begin
  if nullif(btrim(p_name), '') is null or coalesce(p_cost, 0) < 1 then
    raise exception 'item needs a name and a cost';
  end if;
  insert into public.shop_items (household_id, name, cost)
  values (hid, btrim(p_name), p_cost)
  returning id into iid;
  return iid;
end;
$$;

create or replace function private.remove_item(p_item uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  delete from public.shop_items where id = p_item and household_id = hid;
end;
$$;

create or replace function private.fulfill_request(p_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  req public.requests%rowtype;
  kname text;
  iname text;
begin
  select * into req from public.requests where id = p_request and household_id = hid and status = 'pending';
  if req.id is null then
    raise exception 'request not found';
  end if;
  select name into kname from public.kids where id = req.kid_id;
  select name into iname from public.shop_items where id = req.item_id;
  update public.requests set status = 'approved' where id = req.id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, req.kid_id, kname || ' got ' || coalesce(iname, 'an item') || '.');
end;
$$;

create or replace function private.deny_request(p_request uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  req public.requests%rowtype;
  kname text;
begin
  select * into req from public.requests where id = p_request and household_id = hid and status = 'pending';
  if req.id is null then
    raise exception 'request not found';
  end if;
  select name into kname from public.kids where id = req.kid_id;
  update public.kids set points = points + req.cost where id = req.kid_id;
  update public.requests set status = 'denied' where id = req.id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, req.kid_id, req.cost || ' points went back to ' || kname || '.');
end;
$$;

create or replace function private.list_kids(p_code text)
returns table (id uuid, name text, color text)
language sql
stable
security definer
set search_path = ''
as $$
  select k.id, k.name, k.color
  from public.kids k
  order by k.created_at
$$;

create or replace function private.kid_sign_in(p_kid uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  hash text;
  token text;
begin
  select pin_hash into hash from private.kid_pins where kid_id = p_kid;
  if hash is null or extensions.crypt(p_pin, hash) is distinct from hash then
    raise exception 'wrong pin';
  end if;
  token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into private.kid_sessions (kid_id, token_hash, expires_at)
  values (p_kid, encode(extensions.digest(token, 'sha256'), 'hex'), now() + interval '12 hours');
  return token;
end;
$$;

create or replace function private.kid_snapshot(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  hid uuid;
  result jsonb;
  today date := (now() at time zone 'America/Toronto')::date;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select household_id into hid from public.kids where id = kid;
  perform private.ensure_daily(hid);
  select jsonb_build_object(
    'family', jsonb_build_object(
      'name', h.name,
      'code', h.code,
      'points_per_dollar', h.points_per_dollar,
      'points_per_30', h.points_per_30
    ),
    'kid', jsonb_build_object(
      'id', k.id,
      'name', k.name,
      'color', k.color,
      'points', k.points,
      'cash_cents', k.cash_cents,
      'minutes', k.minutes,
      'grounded_until', k.grounded_until
    ),
    'chores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'points', c.points,
        'cash_cents', c.cash_cents, 'minutes', c.minutes, 'status', c.status
      ) order by c.created_at)
      from public.chores c
      where c.kid_id = k.id and c.status <> 'approved'
        and (c.chore_day is null or c.chore_day = today)
    ), '[]'::jsonb),
    'week', coalesce((
      select jsonb_agg(jsonb_build_object(
        'day', d::date,
        'points', coalesce(e.points, 0),
        'cash_cents', coalesce(e.cash_cents, 0)
      ) order by d)
      from generate_series(today - 6, today, interval '1 day') as d
      left join (
        select coalesce(c.chore_day, (c.approved_at at time zone 'America/Toronto')::date) as day,
               sum(c.points)::int as points,
               sum(c.cash_cents)::int as cash_cents
        from public.chores c
        where c.kid_id = k.id and c.status = 'approved' and c.approved_at is not null
        group by 1
      ) e on e.day = d::date
    ), '[]'::jsonb),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'cost', i.cost) order by i.created_at)
      from public.shop_items i
      where i.household_id = k.household_id
    ), '[]'::jsonb),
    'requests', coalesce((
      select jsonb_agg(jsonb_build_object('id', r.id, 'item_id', r.item_id, 'status', r.status))
      from public.requests r
      where r.kid_id = k.id and r.status = 'pending'
    ), '[]'::jsonb),
    'activity', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.id, 'body', a.body, 'created_at', a.created_at) order by a.created_at desc)
      from (
        select * from public.activity
        where kid_id = k.id
        order by created_at desc
        limit 8
      ) a
    ), '[]'::jsonb)
  ) into result
  from public.kids k
  join public.households h on h.id = k.household_id
  where k.id = kid;
  return result;
end;
$$;

create or replace function private.kid_mark_done(p_token text, p_chore uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  chore_title text;
  kname text;
  hid uuid;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  update public.chores
  set status = 'submitted'
  where id = p_chore and kid_id = kid and status = 'open'
  returning chores.title, chores.household_id into chore_title, hid;
  if chore_title is null then
    raise exception 'chore not found';
  end if;
  select name into kname from public.kids where id = kid;
  insert into public.activity (household_id, kid_id, body)
  values (hid, kid, kname || ' marked ' || chore_title || ' done.');
end;
$$;

create or replace function private.kid_cash_out(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  rate integer;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid;
  select points_per_dollar into rate from public.households where id = child.household_id;
  if child.points < rate then
    raise exception 'not enough points';
  end if;
  update public.kids
  set points = points - rate, cash_cents = cash_cents + 100
  where id = kid;
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' cashed ' || rate || ' points for $1.00.');
end;
$$;

create or replace function private.kid_buy_time(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  rate integer;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid;
  if private.is_grounded(child.grounded_until) then
    raise exception 'grounded';
  end if;
  select points_per_30 into rate from public.households where id = child.household_id;
  if child.points < rate then
    raise exception 'not enough points';
  end if;
  update public.kids
  set points = points - rate, minutes = minutes + 30
  where id = kid;
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' bought 30 device minutes.');
end;
$$;

create or replace function private.kid_ask(p_token text, p_item uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  item public.shop_items%rowtype;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid;
  select * into item from public.shop_items where id = p_item and household_id = child.household_id;
  if item.id is null then
    raise exception 'item not found';
  end if;
  if child.points < item.cost then
    raise exception 'not enough points';
  end if;
  if exists (
    select 1 from public.requests
    where kid_id = kid and item_id = item.id and status = 'pending'
  ) then
    raise exception 'already asked';
  end if;
  update public.kids set points = points - item.cost where id = kid;
  insert into public.requests (household_id, kid_id, item_id, cost)
  values (child.household_id, kid, item.id, item.cost);
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' asked for ' || item.name || '.');
end;
$$;

-- Public wrappers. Checks live in private.

create or replace function private.ensure_daily(p_household uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  today date := (now() at time zone 'America/Toronto')::date;
begin
  insert into public.chores (household_id, kid_id, template_id, title, points, chore_day)
  select k.household_id, k.id, t.id, t.title, t.points, today
  from public.kids k
  join public.chore_templates t on t.household_id = k.household_id
  where k.household_id = p_household
  on conflict (template_id, kid_id, chore_day) do nothing;
end;
$$;

create or replace function private.ensure_today()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  perform private.ensure_daily(hid);
end;
$$;

create or replace function private.add_daily_chore(p_title text, p_points integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  tid uuid;
begin
  if nullif(btrim(p_title), '') is null then
    raise exception 'chore required';
  end if;
  insert into public.chore_templates (household_id, title, points)
  values (hid, btrim(p_title), greatest(coalesce(p_points, 0), 0))
  returning id into tid;
  perform private.ensure_daily(hid);
  return tid;
end;
$$;

create or replace function private.save_daily_chore(p_id uuid, p_points integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  pts integer := greatest(coalesce(p_points, 0), 0);
  today date := (now() at time zone 'America/Toronto')::date;
begin
  update public.chore_templates set points = pts where id = p_id and household_id = hid;
  if not found then
    raise exception 'chore not found';
  end if;
  update public.chores
  set points = pts
  where template_id = p_id and household_id = hid and status = 'open' and chore_day = today;
end;
$$;

create or replace function private.remove_daily_chore(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  if not exists (select 1 from public.chore_templates where id = p_id and household_id = hid) then
    raise exception 'chore not found';
  end if;
  delete from public.chores where template_id = p_id and household_id = hid and status = 'open';
  delete from public.chore_templates where id = p_id and household_id = hid;
end;
$$;

create or replace function public.invite_parent(p_email text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.invite_parent(p_email); end $$;

create or replace function public.add_kid(p_name text, p_color text, p_pin text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_kid(p_name, p_color, p_pin) $$;

create or replace function public.set_kid_pin(p_kid uuid, p_pin text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.set_kid_pin(p_kid, p_pin); end $$;

create or replace function public.remove_kid(p_kid uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.remove_kid(p_kid); end $$;

create or replace function public.remove_parent(p_parent uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.remove_parent(p_parent); end $$;

create or replace function public.add_chore(p_kid uuid, p_title text, p_points integer)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_chore(p_kid, p_title, p_points) $$;

create or replace function public.approve_chore(p_chore uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.approve_chore(p_chore); end $$;

create or replace function public.grant_reward(p_kid uuid, p_points integer, p_cash_cents integer, p_minutes integer, p_note text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.grant_reward(p_kid, p_points, p_cash_cents, p_minutes, p_note); end $$;

create or replace function public.ground_kid(p_kid uuid, p_until timestamptz, p_reason text, p_clear boolean)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.ground_kid(p_kid, p_until, p_reason, p_clear); end $$;

create or replace function public.lift_grounding(p_kid uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.lift_grounding(p_kid); end $$;

create or replace function public.save_rates(p_per_dollar integer, p_per_30 integer)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_rates(p_per_dollar, p_per_30); end $$;

create or replace function public.add_item(p_name text, p_cost integer)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_item(p_name, p_cost) $$;

create or replace function public.remove_item(p_item uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.remove_item(p_item); end $$;

create or replace function public.fulfill_request(p_request uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.fulfill_request(p_request); end $$;

create or replace function public.deny_request(p_request uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.deny_request(p_request); end $$;

create or replace function public.list_kids(p_code text)
returns table (id uuid, name text, color text)
language sql security invoker set search_path = ''
as $$ select * from private.list_kids(p_code) $$;

create or replace function public.kid_sign_in(p_kid uuid, p_pin text)
returns text language sql security invoker set search_path = ''
as $$ select private.kid_sign_in(p_kid, p_pin) $$;

create or replace function public.kid_snapshot(p_token text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_snapshot(p_token) $$;

create or replace function public.kid_mark_done(p_token text, p_chore uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_mark_done(p_token, p_chore); end $$;

create or replace function public.kid_cash_out(p_token text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_cash_out(p_token); end $$;

create or replace function public.kid_buy_time(p_token text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_buy_time(p_token); end $$;

create or replace function public.kid_ask(p_token text, p_item uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_ask(p_token, p_item); end $$;

create or replace function public.ensure_today()
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.ensure_today(); end $$;

create or replace function public.add_daily_chore(p_title text, p_points integer)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_daily_chore(p_title, p_points) $$;

create or replace function public.save_daily_chore(p_id uuid, p_points integer)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_daily_chore(p_id, p_points); end $$;

create or replace function public.remove_daily_chore(p_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.remove_daily_chore(p_id); end $$;

do $$
declare
  fn text;
begin
  foreach fn in array array[
    'private.household_id()',
    'private.require_household()',
    'private.kid_from_token(text)',
    'private.is_grounded(timestamptz)',
    'private.handle_new_parent()',
    'private.invite_parent(text)',
    'private.add_kid(text, text, text)',
    'private.set_kid_pin(uuid, text)',
    'private.remove_kid(uuid)',
    'private.remove_parent(uuid)',
    'private.add_chore(uuid, text, integer)',
    'private.approve_chore(uuid)',
    'private.grant_reward(uuid, integer, integer, integer, text)',
    'private.ground_kid(uuid, timestamptz, text, boolean)',
    'private.lift_grounding(uuid)',
    'private.save_rates(integer, integer)',
    'private.add_item(text, integer)',
    'private.remove_item(uuid)',
    'private.fulfill_request(uuid)',
    'private.deny_request(uuid)',
    'private.list_kids(text)',
    'private.kid_sign_in(uuid, text)',
    'private.kid_snapshot(text)',
    'private.kid_mark_done(text, uuid)',
    'private.kid_cash_out(text)',
    'private.kid_buy_time(text)',
    'private.kid_ask(text, uuid)',
    'public.invite_parent(text)',
    'public.add_kid(text, text, text)',
    'public.set_kid_pin(uuid, text)',
    'public.remove_kid(uuid)',
    'public.remove_parent(uuid)',
    'public.add_chore(uuid, text, integer)',
    'public.approve_chore(uuid)',
    'public.grant_reward(uuid, integer, integer, integer, text)',
    'public.ground_kid(uuid, timestamptz, text, boolean)',
    'public.lift_grounding(uuid)',
    'public.save_rates(integer, integer)',
    'public.add_item(text, integer)',
    'public.remove_item(uuid)',
    'public.fulfill_request(uuid)',
    'public.deny_request(uuid)',
    'public.list_kids(text)',
    'public.kid_sign_in(uuid, text)',
    'public.kid_snapshot(text)',
    'public.kid_mark_done(text, uuid)',
    'public.kid_cash_out(text)',
    'public.kid_buy_time(text)',
    'public.kid_ask(text, uuid)',
    'private.ensure_daily(uuid)',
    'private.ensure_today()',
    'private.add_daily_chore(text, integer)',
    'private.save_daily_chore(uuid, integer)',
    'private.remove_daily_chore(uuid)',
    'public.ensure_today()',
    'public.add_daily_chore(text, integer)',
    'public.save_daily_chore(uuid, integer)',
    'public.remove_daily_chore(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn);
  end loop;
end $$;

grant execute on function private.household_id() to authenticated;
grant execute on function private.require_household() to authenticated;
grant execute on function private.invite_parent(text) to authenticated;
grant execute on function private.add_kid(text, text, text) to authenticated;
grant execute on function private.set_kid_pin(uuid, text) to authenticated;
grant execute on function private.remove_kid(uuid) to authenticated;
grant execute on function private.remove_parent(uuid) to authenticated;
grant execute on function private.add_chore(uuid, text, integer) to authenticated;
grant execute on function private.approve_chore(uuid) to authenticated;
grant execute on function private.grant_reward(uuid, integer, integer, integer, text) to authenticated;
grant execute on function private.ground_kid(uuid, timestamptz, text, boolean) to authenticated;
grant execute on function private.lift_grounding(uuid) to authenticated;
grant execute on function private.save_rates(integer, integer) to authenticated;
grant execute on function private.add_item(text, integer) to authenticated;
grant execute on function private.remove_item(uuid) to authenticated;
grant execute on function private.fulfill_request(uuid) to authenticated;
grant execute on function private.deny_request(uuid) to authenticated;
grant execute on function private.list_kids(text) to anon, authenticated;
grant execute on function private.kid_sign_in(uuid, text) to anon, authenticated;
grant execute on function private.kid_snapshot(text) to anon, authenticated;
grant execute on function private.kid_mark_done(text, uuid) to anon, authenticated;
grant execute on function private.kid_cash_out(text) to anon, authenticated;
grant execute on function private.kid_buy_time(text) to anon, authenticated;
grant execute on function private.kid_ask(text, uuid) to anon, authenticated;

grant execute on function public.invite_parent(text) to authenticated;
grant execute on function public.add_kid(text, text, text) to authenticated;
grant execute on function public.set_kid_pin(uuid, text) to authenticated;
grant execute on function public.remove_kid(uuid) to authenticated;
grant execute on function public.remove_parent(uuid) to authenticated;
grant execute on function public.add_chore(uuid, text, integer) to authenticated;
grant execute on function public.approve_chore(uuid) to authenticated;
grant execute on function public.grant_reward(uuid, integer, integer, integer, text) to authenticated;
grant execute on function public.ground_kid(uuid, timestamptz, text, boolean) to authenticated;
grant execute on function public.lift_grounding(uuid) to authenticated;
grant execute on function public.save_rates(integer, integer) to authenticated;
grant execute on function public.add_item(text, integer) to authenticated;
grant execute on function public.remove_item(uuid) to authenticated;
grant execute on function public.fulfill_request(uuid) to authenticated;
grant execute on function public.deny_request(uuid) to authenticated;
grant execute on function public.list_kids(text) to anon, authenticated;
grant execute on function public.kid_sign_in(uuid, text) to anon, authenticated;
grant execute on function public.kid_snapshot(text) to anon, authenticated;
grant execute on function public.kid_mark_done(text, uuid) to anon, authenticated;
grant execute on function public.kid_cash_out(text) to anon, authenticated;
grant execute on function public.kid_buy_time(text) to anon, authenticated;
grant execute on function public.kid_ask(text, uuid) to anon, authenticated;
grant execute on function private.ensure_daily(uuid) to authenticated;
grant execute on function private.ensure_today() to authenticated;
grant execute on function private.add_daily_chore(text, integer) to authenticated;
grant execute on function private.save_daily_chore(uuid, integer) to authenticated;
grant execute on function private.remove_daily_chore(uuid) to authenticated;
grant execute on function public.ensure_today() to authenticated;
grant execute on function public.add_daily_chore(text, integer) to authenticated;
grant execute on function public.save_daily_chore(uuid, integer) to authenticated;
grant execute on function public.remove_daily_chore(uuid) to authenticated;
