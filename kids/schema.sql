-- Family chart tables for getsthejobdone.ca/kids.
-- Run this once in the Supabase SQL editor for project zobihpqcvodqhfyxtpzm.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

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
  sprite text not null default 'dust' check (sprite in ('dust', 'bed', 'shoes', 'pack', 'dishes', 'teeth', 'laundry', 'toys', 'reading', 'pet', 'plants', 'table', 'trash', 'counters', 'towels', 'bookshelf', 'lunch', 'coats', 'groceries', 'homework', 'dressed', 'petbrush', 'leaves', 'snow', 'outside', 'wood')),
  created_at timestamptz not null default now()
);

create table if not exists public.chore_templates (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  points integer not null default 1 check (points >= 0),
  kind text not null default 'daily' check (kind in ('daily', 'special')),
  sprite text not null default 'dust' check (sprite in ('dust', 'bed', 'shoes', 'pack', 'dishes', 'teeth', 'laundry', 'toys', 'reading', 'pet', 'plants', 'table', 'trash', 'counters', 'towels', 'bookshelf', 'lunch', 'coats', 'groceries', 'homework', 'dressed', 'petbrush', 'leaves', 'snow', 'outside', 'wood')),
  created_at timestamptz not null default now()
);

alter table public.chores add column if not exists template_id uuid references public.chore_templates (id) on delete set null;
alter table public.chores add column if not exists chore_day date;
alter table public.chores add column if not exists approved_at timestamptz;
alter table public.chore_templates add column if not exists kind text not null default 'daily' check (kind in ('daily', 'special'));
alter table public.chores add column if not exists sprite text not null default 'dust';
alter table public.chore_templates add column if not exists sprite text not null default 'dust';
alter table public.chore_templates add column if not exists active boolean not null default true;
alter table public.chore_templates add column if not exists assignee_id uuid references public.kids (id) on delete cascade;
alter table public.chore_templates add column if not exists section_id uuid;
alter table public.chore_templates add column if not exists sort_order integer not null default 0;

create table if not exists public.chore_sections (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null,
  start_minute integer not null check (start_minute >= 0 and start_minute < 1440),
  end_minute integer not null check (end_minute >= 0 and end_minute < 1440),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.chore_sections enable row level security;
do $$ begin
  alter table public.chore_templates
    drop constraint if exists chore_templates_section_id_fkey;
  alter table public.chore_templates
    add constraint chore_templates_section_id_fkey
    foreign key (section_id) references public.chore_sections (id) on delete set null;
exception when others then null;
end $$;
alter table public.chores add column if not exists verdict text;
alter table public.kids add column if not exists progress_reset_at timestamptz;
alter table public.chores drop constraint if exists chores_verdict_check;
alter table public.chores add constraint chores_verdict_check check (verdict is null or verdict = 'flee');
create unique index if not exists chores_daily_once on public.chores (template_id, kid_id, chore_day);
create unique index if not exists chores_special_once on public.chores (template_id, kid_id) where chore_day is null and template_id is not null;

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
  alter table public.chores drop constraint if exists chores_sprite_check;
  alter table public.chores
    add constraint chores_sprite_check
    check (sprite in ('dust', 'bed', 'shoes', 'pack', 'dishes', 'teeth', 'laundry', 'toys', 'reading', 'pet', 'plants', 'table', 'trash', 'counters', 'towels', 'bookshelf', 'lunch', 'coats', 'groceries', 'homework', 'dressed', 'petbrush', 'leaves', 'snow', 'outside', 'wood'));
  alter table public.chore_templates drop constraint if exists chore_templates_sprite_check;
  alter table public.chore_templates
    add constraint chore_templates_sprite_check
    check (sprite in ('dust', 'bed', 'shoes', 'pack', 'dishes', 'teeth', 'laundry', 'toys', 'reading', 'pet', 'plants', 'table', 'trash', 'counters', 'towels', 'bookshelf', 'lunch', 'coats', 'groceries', 'homework', 'dressed', 'petbrush', 'leaves', 'snow', 'outside', 'wood'));
end $$;

create or replace function private.normalize_sprite(p_sprite text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_sprite in ('dust', 'bed', 'shoes', 'pack', 'dishes', 'teeth', 'laundry', 'toys', 'reading', 'pet', 'plants', 'table', 'trash', 'counters', 'towels', 'bookshelf', 'lunch', 'coats', 'groceries', 'homework', 'dressed', 'petbrush', 'leaves', 'snow', 'outside', 'wood') then p_sprite
    else 'dust'
  end
$$;

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
  insert into public.chores (household_id, kid_id, template_id, title, points, sprite)
  select hid, kid, t.id, t.title, t.points, t.sprite
  from public.chore_templates t
  where t.household_id = hid and t.kind = 'special' and t.assignee_id is null
  on conflict (template_id, kid_id) where chore_day is null and template_id is not null do nothing;
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
  insert into public.chores (household_id, kid_id, title, points, sprite)
  values (
    hid,
    p_kid,
    btrim(p_title),
    greatest(coalesce(p_points, 0), 0),
    private.normalize_sprite(case
      when btrim(p_title) ~* 'bed|sheet|pillow|blanket' then 'bed'
      when btrim(p_title) ~* 'shoe|boot' then 'shoes'
      when btrim(p_title) ~* 'bookshelf|book shelf|shelf' then 'bookshelf'
      when btrim(p_title) ~* 'pet brush|brush(ed|ing)?( the)? pet' then 'petbrush'
      when btrim(p_title) ~* 'towel' then 'towels'
      when btrim(p_title) ~* 'dress|pajama|pyjama' then 'dressed'
      when btrim(p_title) ~* 'homework' then 'homework'
      when btrim(p_title) ~* 'lunch' then 'lunch'
      when btrim(p_title) ~* 'coat|jacket' then 'coats'
      when btrim(p_title) ~* 'grocer' then 'groceries'
      when btrim(p_title) ~* 'trash|garbage|rubbish' then 'trash'
      when btrim(p_title) ~* 'counter' then 'counters'
      when btrim(p_title) ~* 'leaf|rake' then 'leaves'
      when btrim(p_title) ~* 'plant|flower' then 'plants'
      when btrim(p_title) ~* 'kibble|pet food|(^|[^[:alpha:]])pet([^[:alpha:]]|$)' then 'pet'
      when btrim(p_title) ~* '(^|[^[:alpha:]])table([^[:alpha:]]|$)' then 'table'
      when btrim(p_title) ~* 'teeth|tooth|brush|paste' then 'teeth'
      when btrim(p_title) ~* 'laundry|sock|clothes|fold' then 'laundry'
      when btrim(p_title) ~* 'toy|lego|blocks?' then 'toys'
      when btrim(p_title) ~* 'read|book|page|story' then 'reading'
      when btrim(p_title) ~* 'pack|bag|school' then 'pack'
      when btrim(p_title) ~* 'dish|sink|plate|cup|kitchen' then 'dishes'
      else 'dust'
    end)
  )
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

create or replace function private.spend_balance(
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
  detail text := nullif(btrim(coalesce(p_note, '')), '');
  lead text;
begin
  select * into child from public.kids where id = p_kid and household_id = hid;
  if child.id is null then
    raise exception 'kid not found';
  end if;
  if pts = 0 and cash = 0 and mins = 0 then
    raise exception 'enter coins, cash, or minutes';
  end if;
  if child.points < pts then
    raise exception 'not enough coins';
  end if;
  if child.cash_cents < cash then
    raise exception 'not enough cash';
  end if;
  if child.minutes < mins then
    raise exception 'not enough minutes';
  end if;
  update public.kids
  set points = points - pts,
      cash_cents = cash_cents - cash,
      minutes = minutes - mins
  where id = child.id;
  if pts > 0 and mins > 0 and cash = 0 then
    lead := child.name || ' spent ' || pts || ' coins and cashed in ' || mins || ' minutes';
  elsif pts > 0 and mins = 0 and cash = 0 then
    lead := child.name || ' spent ' || pts || ' coins';
  elsif mins > 0 and pts = 0 and cash = 0 then
    lead := child.name || ' cashed in ' || mins || ' minutes';
  elsif cash > 0 and pts = 0 and mins = 0 then
    lead := child.name || ' was paid ' || trim(to_char(cash / 100.0, 'FM$999990.00'));
  else
    lead := child.name || ' had a balance taken off';
  end if;
  insert into public.activity (household_id, kid_id, body)
  values (hid, child.id, lead || coalesce(': ' || detail, '') || '.');
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

create or replace function private.toronto_minute()
returns integer
language sql
stable
set search_path = ''
as $$
  select (
    extract(hour from timezone('America/Toronto', now()))::integer * 60
    + extract(minute from timezone('America/Toronto', now()))::integer
  )
$$;

create or replace function private.section_is_open(p_start integer, p_end integer, p_now integer default null)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_start is null or p_end is null then true
    when p_start = p_end then true
    when p_start < p_end then coalesce(p_now, 0) >= p_start and coalesce(p_now, 0) < p_end
    else coalesce(p_now, 0) >= p_start or coalesce(p_now, 0) < p_end
  end
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
  now_min integer := private.toronto_minute();
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
        'cash_cents', c.cash_cents, 'minutes', c.minutes, 'status', c.status,
        'sprite', c.sprite,
        'verdict', c.verdict,
        'special', (c.chore_day is null),
        'section_id', t.section_id,
        'section_title', s.title,
        'section_start', s.start_minute,
        'section_end', s.end_minute,
        'sort_order', coalesce(t.sort_order, 0)
      ) order by
        case when c.chore_day is null then 1 else 0 end,
        coalesce(s.sort_order, -1),
        coalesce(t.sort_order, 0),
        c.created_at
      )
      from public.chores c
      left join public.chore_templates t on t.id = c.template_id
      left join public.chore_sections s on s.id = t.section_id
      where c.kid_id = k.id and c.status <> 'approved'
        and (c.chore_day is null or c.chore_day = today)
        and (
          c.chore_day is null
          or c.status = 'submitted'
          or t.section_id is null
          or private.section_is_open(s.start_minute, s.end_minute, now_min)
        )
    ), '[]'::jsonb),
    'sections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', s.id,
        'title', s.title,
        'start_minute', s.start_minute,
        'end_minute', s.end_minute,
        'open', private.section_is_open(s.start_minute, s.end_minute, now_min),
        'sort_order', s.sort_order
      ) order by s.sort_order, s.created_at)
      from public.chore_sections s
      where s.household_id = k.household_id
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
          and (k.progress_reset_at is null or c.approved_at > k.progress_reset_at)
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
  set status = 'submitted', verdict = null
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
  insert into public.chores (household_id, kid_id, template_id, title, points, sprite, chore_day)
  select k.household_id, k.id, t.id, t.title, t.points, t.sprite, today
  from public.kids k
  join public.chore_templates t on t.household_id = k.household_id and t.kind = 'daily' and t.active
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

drop function if exists public.add_daily_chore(text, integer);
drop function if exists private.add_daily_chore(text, integer);

drop function if exists public.add_daily_chore(text, integer, text);
drop function if exists private.add_daily_chore(text, integer, text);
drop function if exists public.add_daily_chore(text, integer);
drop function if exists private.add_daily_chore(text, integer);

create or replace function private.add_daily_chore(p_title text, p_points integer, p_sprite text default 'dust', p_section uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  tid uuid;
  chosen text := private.normalize_sprite(p_sprite);
  next_ord integer;
  section uuid := p_section;
begin
  if nullif(btrim(p_title), '') is null then
    raise exception 'chore required';
  end if;
  if section is not null and not exists (
    select 1 from public.chore_sections where id = section and household_id = hid
  ) then
    raise exception 'section not found';
  end if;
  select coalesce(max(sort_order), -1) + 1 into next_ord
  from public.chore_templates
  where household_id = hid and kind = 'daily' and section_id is not distinct from section;
  insert into public.chore_templates (household_id, title, points, sprite, section_id, sort_order)
  values (hid, btrim(p_title), greatest(coalesce(p_points, 0), 0), chosen, section, next_ord)
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
  update public.chore_templates set points = pts where id = p_id and household_id = hid and kind = 'daily';
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
  if not exists (select 1 from public.chore_templates where id = p_id and household_id = hid and kind = 'daily') then
    raise exception 'chore not found';
  end if;
  delete from public.chores where template_id = p_id and household_id = hid and status = 'open';
  delete from public.chore_templates where id = p_id and household_id = hid;
end;
$$;

drop function if exists public.add_special_chore(text, integer);
drop function if exists private.add_special_chore(text, integer);
drop function if exists public.add_special_chore(text, integer, text);
drop function if exists private.add_special_chore(text, integer, text);

create or replace function private.add_special_chore(p_title text, p_points integer, p_sprite text default 'dust', p_kid uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  tid uuid;
  title text := btrim(p_title);
  pts integer := greatest(coalesce(p_points, 0), 0);
  chosen text := private.normalize_sprite(p_sprite);
begin
  if title is null or title = '' then
    raise exception 'chore required';
  end if;
  if p_kid is not null and not exists (
    select 1 from public.kids where id = p_kid and household_id = hid
  ) then
    raise exception 'kid not found';
  end if;
  insert into public.chore_templates (household_id, title, points, kind, sprite, assignee_id)
  values (hid, title, pts, 'special', chosen, p_kid)
  returning id into tid;
  insert into public.chores (household_id, kid_id, template_id, title, points, sprite)
  select hid, k.id, tid, title, pts, chosen
  from public.kids k
  where k.household_id = hid
    and (p_kid is null or k.id = p_kid);
  return tid;
end;
$$;

create or replace function private.set_chore_sprite(p_id uuid, p_sprite text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  chosen text := private.normalize_sprite(p_sprite);
begin
  update public.chore_templates
  set sprite = chosen
  where id = p_id and household_id = hid;
  if not found then
    raise exception 'chore not found';
  end if;
  update public.chores
  set sprite = chosen
  where template_id = p_id and household_id = hid and status <> 'approved';
end;
$$;

create or replace function private.remove_special_chore(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  if not exists (select 1 from public.chore_templates where id = p_id and household_id = hid and kind = 'special') then
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

create or replace function public.spend_balance(p_kid uuid, p_points integer, p_cash_cents integer, p_minutes integer, p_note text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.spend_balance(p_kid, p_points, p_cash_cents, p_minutes, p_note); end $$;

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

create or replace function public.add_daily_chore(p_title text, p_points integer, p_sprite text default 'dust', p_section uuid default null)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_daily_chore(p_title, p_points, p_sprite, p_section) $$;

create or replace function public.save_daily_chore(p_id uuid, p_points integer)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.save_daily_chore(p_id, p_points); end $$;

create or replace function public.remove_daily_chore(p_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.remove_daily_chore(p_id); end $$;

create or replace function public.add_special_chore(p_title text, p_points integer, p_sprite text default 'dust', p_kid uuid default null)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_special_chore(p_title, p_points, p_sprite, p_kid) $$;

create or replace function public.set_chore_sprite(p_id uuid, p_sprite text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.set_chore_sprite(p_id, p_sprite); end $$;

create or replace function public.remove_special_chore(p_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.remove_special_chore(p_id); end $$;

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
    'private.spend_balance(uuid, integer, integer, integer, text)',
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
    'public.spend_balance(uuid, integer, integer, integer, text)',
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
    'private.normalize_sprite(text)',
    'private.add_daily_chore(text, integer, text, uuid)',
    'private.save_daily_chore(uuid, integer)',
    'private.remove_daily_chore(uuid)',
    'public.ensure_today()',
    'public.add_daily_chore(text, integer, text, uuid)',
    'public.save_daily_chore(uuid, integer)',
    'public.remove_daily_chore(uuid)',
    'private.add_special_chore(text, integer, text, uuid)',
    'private.set_chore_sprite(uuid, text)',
    'private.remove_special_chore(uuid)',
    'public.add_special_chore(text, integer, text, uuid)',
    'public.set_chore_sprite(uuid, text)',
    'public.remove_special_chore(uuid)'
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
grant execute on function private.spend_balance(uuid, integer, integer, integer, text) to authenticated;
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
grant execute on function public.spend_balance(uuid, integer, integer, integer, text) to authenticated;
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
grant execute on function private.add_daily_chore(text, integer, text, uuid) to authenticated;
grant execute on function private.save_daily_chore(uuid, integer) to authenticated;
grant execute on function private.remove_daily_chore(uuid) to authenticated;
grant execute on function public.ensure_today() to authenticated;
grant execute on function public.add_daily_chore(text, integer, text, uuid) to authenticated;
grant execute on function public.save_daily_chore(uuid, integer) to authenticated;
grant execute on function public.remove_daily_chore(uuid) to authenticated;
grant execute on function private.add_special_chore(text, integer, text, uuid) to authenticated;
grant execute on function private.set_chore_sprite(uuid, text) to authenticated;
grant execute on function private.remove_special_chore(uuid) to authenticated;
grant execute on function public.add_special_chore(text, integer, text, uuid) to authenticated;
grant execute on function public.set_chore_sprite(uuid, text) to authenticated;
grant execute on function public.remove_special_chore(uuid) to authenticated;

create table if not exists private.parent_pins (
  parent_id uuid primary key references public.parents (id) on delete cascade,
  pin_hash text not null
);

create table if not exists private.parent_pin_guard (
  parent_id uuid primary key references public.parents (id) on delete cascade,
  failures integer not null default 0,
  locked_until timestamptz
);

revoke all on table private.parent_pins, private.parent_pin_guard from public, anon, authenticated;
alter table private.parent_pins enable row level security;
alter table private.parent_pin_guard enable row level security;

drop function if exists public.list_players();
drop function if exists private.list_players();

create or replace function private.list_players()
returns table (id uuid, name text, color text, kind text, has_pin boolean, hero text, weapon text)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.name, q.color, q.kind, q.has_pin, q.hero, q.weapon
  from (
    select k.id, k.name, k.color, 'kid'::text as kind, true as has_pin, k.hero, k.weapon, k.created_at, 0 as grp
    from public.kids k
    union all
    select p.id, p.name, 'teal'::text, 'parent'::text,
      exists (select 1 from private.parent_pins pins where pins.parent_id = p.id),
      null::text,
      'broom'::text,
      p.created_at, 1
    from public.parents p
  ) q
  order by q.grp, q.created_at
$$;

create or replace function private.set_parent_pin(p_parent uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  pname text;
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'pin must be 4 digits';
  end if;
  select name into pname from public.parents where id = p_parent and household_id = hid;
  if pname is null then
    raise exception 'parent not found';
  end if;
  insert into private.parent_pins (parent_id, pin_hash)
  values (p_parent, extensions.crypt(p_pin, extensions.gen_salt('bf')))
  on conflict (parent_id) do update set pin_hash = excluded.pin_hash;
  insert into private.parent_pin_guard (parent_id, failures, locked_until)
  values (p_parent, 0, null)
  on conflict (parent_id) do update set failures = 0, locked_until = null;
  insert into public.activity (household_id, body)
  values (hid, pname || ' has a door PIN.');
end;
$$;

create or replace function private.door_ready()
returns table (parent_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  return query
  select pins.parent_id
  from private.parent_pins pins
  join public.parents p on p.id = pins.parent_id
  where p.household_id = hid;
end;
$$;

create or replace function private.claim_parent_pin(p_parent uuid, p_pin text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hash text;
  uid uuid;
  fails integer;
  locked timestamptz;
begin
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'wrong pin';
  end if;
  select user_id into uid from public.parents where id = p_parent;
  if uid is null then
    raise exception 'wrong pin';
  end if;
  select failures, locked_until into fails, locked
  from private.parent_pin_guard where parent_id = p_parent;
  if locked is not null and locked > now() then
    raise exception 'too many tries';
  end if;
  select pin_hash into hash from private.parent_pins where parent_id = p_parent;
  if hash is null or extensions.crypt(p_pin, hash) is distinct from hash then
    fails := coalesce(fails, 0) + 1;
    if fails >= 8 then
      insert into private.parent_pin_guard (parent_id, failures, locked_until)
      values (p_parent, 0, now() + interval '15 minutes')
      on conflict (parent_id) do update
      set failures = 0, locked_until = excluded.locked_until;
    else
      insert into private.parent_pin_guard (parent_id, failures, locked_until)
      values (p_parent, fails, null)
      on conflict (parent_id) do update
      set failures = excluded.failures, locked_until = null;
    end if;
    raise exception 'wrong pin';
  end if;
  insert into private.parent_pin_guard (parent_id, failures, locked_until)
  values (p_parent, 0, null)
  on conflict (parent_id) do update set failures = 0, locked_until = null;
  return uid;
end;
$$;

create or replace function public.list_players()
returns table (id uuid, name text, color text, kind text, has_pin boolean, hero text, weapon text)
language sql security invoker set search_path = ''
as $$ select * from private.list_players() $$;

create or replace function public.set_parent_pin(p_parent uuid, p_pin text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.set_parent_pin(p_parent, p_pin); end $$;

create or replace function public.door_ready()
returns table (parent_id uuid)
language sql security invoker set search_path = ''
as $$ select * from private.door_ready() $$;

create or replace function public.claim_parent_pin(p_parent uuid, p_pin text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.claim_parent_pin(p_parent, p_pin) $$;

revoke all on function private.list_players() from public, anon, authenticated;
revoke all on function private.set_parent_pin(uuid, text) from public, anon, authenticated;
revoke all on function private.door_ready() from public, anon, authenticated;
revoke all on function private.claim_parent_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.list_players() from public, anon, authenticated;
revoke all on function public.set_parent_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.door_ready() from public, anon, authenticated;
revoke all on function public.claim_parent_pin(uuid, text) from public, anon, authenticated;

grant execute on function private.list_players() to anon, authenticated;
grant execute on function private.set_parent_pin(uuid, text) to authenticated;
grant execute on function private.door_ready() to authenticated;
grant execute on function private.claim_parent_pin(uuid, text) to service_role;
grant execute on function public.list_players() to anon, authenticated;
grant execute on function public.set_parent_pin(uuid, text) to authenticated;
grant execute on function public.door_ready() to authenticated;
grant execute on function public.claim_parent_pin(uuid, text) to service_role;

alter table public.kids add column if not exists hero text not null default 'knight';
alter table public.kids add column if not exists weapon text not null default 'broom';
alter table public.kids drop constraint if exists kids_hero_check;
alter table public.kids add constraint kids_hero_check check (hero in ('knight', 'princess'));

create table if not exists public.kid_rewards (
  kid_id uuid not null references public.kids (id) on delete cascade,
  kind text not null check (kind in ('achievement', 'weapon')),
  key text not null,
  earned_at timestamptz not null default now(),
  primary key (kid_id, kind, key)
);
alter table public.kid_rewards enable row level security;
revoke all on table public.kid_rewards from public, anon, authenticated;

create or replace function private.weapon_rules()
returns table (key text, mode text, goal integer, chore text)
language sql
immutable
set search_path = ''
as $$
  select * from (values
    ('broom', 'starter', 1, null::text),
    ('duster', 'streak', 3, null::text),
    ('dustpan', 'total', 10, null::text),
    ('mop', 'streak', 7, null::text),
    ('sponge', 'total', 25, null::text),
    ('squeegee', 'streak', 14, null::text),
    ('spray', 'total', 50, null::text),
    ('vacuum', 'streak', 21, null::text),
    ('plunger', 'total', 75, null::text),
    ('golden', 'streak', 30, null::text),
    ('diamond', 'total', 100, null::text),
    ('toothbrush', 'chore', 20, 'teeth'),
    ('spatula', 'chore', 20, 'dishes'),
    ('bubble', 'chore', 50, 'dishes'),
    ('rake', 'chore', 10, 'leaves'),
    ('pencil', 'chore', 20, 'homework'),
    ('lint', 'chore', 30, 'laundry'),
    ('watering', 'chore', 20, 'plants'),
    ('bookmark', 'chore', 20, 'reading'),
    ('bone', 'chore', 25, 'pet'),
    ('shovel', 'chore', 10, 'snow'),
    ('bat', 'chore', 15, 'outside'),
    ('mallet', 'chore', 15, 'wood')
  ) as rules(key, mode, goal, chore)
$$;

create or replace function private.kid_stats(p_kid uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  battles integer := 0;
  coins integer := 0;
  early integer := 0;
  chores jsonb := '{}'::jsonb;
  best integer := 0;
  streak integer := 0;
begin
  select count(*)::integer,
         coalesce(sum(c.points), 0)::integer,
         count(*) filter (where extract(hour from c.approved_at at time zone 'America/Toronto') < 8)::integer
  into battles, coins, early
  from public.chores c
  join public.kids kid on kid.id = c.kid_id
  where c.kid_id = p_kid and c.status = 'approved'
    and (kid.progress_reset_at is null or c.approved_at > kid.progress_reset_at);

  select coalesce(jsonb_object_agg(sprite, n), '{}'::jsonb)
  into chores
  from (
    select c.sprite, count(*)::integer as n
    from public.chores c
    join public.kids kid on kid.id = c.kid_id
    where c.kid_id = p_kid and c.status = 'approved'
      and (kid.progress_reset_at is null or c.approved_at > kid.progress_reset_at)
    group by c.sprite
  ) counts;

  with days as (
    select distinct (c.approved_at at time zone 'America/Toronto')::date as day
    from public.chores c
    join public.kids kid on kid.id = c.kid_id
    where c.kid_id = p_kid and c.status = 'approved' and c.approved_at is not null
      and (kid.progress_reset_at is null or c.approved_at > kid.progress_reset_at)
  ),
  islands as (
    select day, day - (row_number() over (order by day))::integer as grp
    from days
  ),
  runs as (
    select count(*)::integer as len, max(day) as last_day
    from islands
    group by grp
  )
  select coalesce(max(len), 0),
         coalesce(max(len) filter (
           where last_day >= (timezone('America/Toronto', now()))::date - 1
         ), 0)
  into best, streak
  from runs;

  return jsonb_build_object(
    'battles', battles,
    'coins', coins,
    'earlyBird', early,
    'streak', streak,
    'bestStreak', best,
    'chores', chores
  );
end;
$$;

create or replace function private.weapon_value(p_key text, p_stats jsonb)
returns integer
language sql
stable
set search_path = ''
as $$
  select case rule.mode
    when 'starter' then 1
    when 'streak' then greatest(coalesce((p_stats->>'streak')::integer, 0), coalesce((p_stats->>'bestStreak')::integer, 0))
    when 'total' then coalesce((p_stats->>'battles')::integer, 0)
    else coalesce((p_stats->'chores'->>rule.chore)::integer, 0)
  end
  from private.weapon_rules() rule
  where rule.key = p_key
$$;

create or replace function private.unlocked_weapon_count(p_stats jsonb)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::integer
  from private.weapon_rules() rule
  where private.weapon_value(rule.key, p_stats) >= rule.goal
$$;

create or replace function private.monster_kinds()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['dust','bed','shoes','pack','dishes','teeth','laundry','toys','reading','pet','plants','table','trash','counters','towels','bookshelf','lunch','coats','groceries','homework','dressed','petbrush','leaves','snow','outside','wood']
$$;

create or replace function private.sync_kid_rewards(p_kid uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  stats jsonb := private.kid_stats(p_kid);
  fresh jsonb;
begin
  with earned as (
    select 'weapon'::text as kind, rule.key
    from private.weapon_rules() rule
    where private.weapon_value(rule.key, stats) >= rule.goal
    union all
    select 'achievement', item.key
    from (
      values
        ('first', 1, coalesce((stats->>'battles')::integer, 0)),
        ('hunter', 10, coalesce((stats->>'battles')::integer, 0)),
        ('legend', 50, coalesce((stats->>'battles')::integer, 0)),
        ('fame', 100, coalesce((stats->>'battles')::integer, 0)),
        ('coins100', 100, coalesce((stats->>'coins')::integer, 0)),
        ('coins500', 500, coalesce((stats->>'coins')::integer, 0)),
        ('coins1000', 1000, coalesce((stats->>'coins')::integer, 0)),
        ('bedboss', 7, coalesce((stats->'chores'->>'bed')::integer, 0)),
        ('smile', 14, coalesce((stats->'chores'->>'teeth')::integer, 0)),
        ('bookworm', 10, coalesce((stats->'chores'->>'reading')::integer, 0)),
        ('socks', 10, coalesce((stats->'chores'->>'laundry')::integer, 0)),
        ('petpal', 10, coalesce((stats->'chores'->>'pet')::integer, 0)),
        ('suds', 15, coalesce((stats->'chores'->>'dishes')::integer, 0)),
        ('snowday', 5, coalesce((stats->'chores'->>'snow')::integer, 0)),
        ('freshair', 10, coalesce((stats->'chores'->>'outside')::integer, 0)),
        ('firekeeper', 10, coalesce((stats->'chores'->>'wood')::integer, 0)),
        ('early', 1, coalesce((stats->>'earlyBird')::integer, 0)),
        ('week', 7, greatest(coalesce((stats->>'streak')::integer, 0), coalesce((stats->>'bestStreak')::integer, 0))),
        ('month', 30, greatest(coalesce((stats->>'streak')::integer, 0), coalesce((stats->>'bestStreak')::integer, 0))),
        ('arsenal', 5, private.unlocked_weapon_count(stats)),
        ('armory', 23, private.unlocked_weapon_count(stats)),
        ('encyclopedia', 26, (
          select count(*)::integer
          from unnest(private.monster_kinds()) as kind
          where coalesce((stats->'chores'->>kind)::integer, 0) > 0
        ))
    ) as item(key, goal, value)
    where item.value >= item.goal
  ),
  inserted as (
    insert into public.kid_rewards (kid_id, kind, key)
    select p_kid, earned.kind, earned.key
    from earned
    on conflict do nothing
    returning kind, key
  )
  select jsonb_build_object(
    'achievements', coalesce((select jsonb_agg(key) from inserted where kind = 'achievement'), '[]'::jsonb),
    'weapons', coalesce((select jsonb_agg(key) from inserted where kind = 'weapon'), '[]'::jsonb)
  )
  into fresh;
  return fresh;
end;
$$;

create or replace function private.kid_hero_board(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  stats jsonb;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  stats := private.kid_stats(kid);
  return jsonb_build_object(
    'hero', (select hero from public.kids where id = kid),
    'weapon', (select weapon from public.kids where id = kid),
    'stats', stats,
    'achievements', coalesce((
      select jsonb_agg(key order by earned_at)
      from public.kid_rewards
      where kid_id = kid and kind = 'achievement'
    ), '[]'::jsonb),
    'weapons', coalesce((
      select jsonb_agg(key order by earned_at)
      from public.kid_rewards
      where kid_id = kid and kind = 'weapon'
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function private.kid_set_hero(p_token text, p_hero text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  if p_hero not in ('knight', 'princess') then
    raise exception 'pick a hero';
  end if;
  update public.kids set hero = p_hero where id = kid;
end;
$$;

create or replace function private.kid_set_weapon(p_token text, p_weapon text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  stats jsonb;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  if not exists (select 1 from private.weapon_rules() where key = p_weapon) then
    raise exception 'unknown weapon';
  end if;
  stats := private.kid_stats(kid);
  if private.weapon_value(p_weapon, stats) < (select goal from private.weapon_rules() where key = p_weapon) then
    raise exception 'weapon locked';
  end if;
  update public.kids set weapon = p_weapon where id = kid;
end;
$$;

create or replace function private.kid_sync_rewards(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  return private.sync_kid_rewards(kid);
end;
$$;

create or replace function public.kid_hero_board(p_token text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_hero_board(p_token) $$;

create or replace function public.kid_set_hero(p_token text, p_hero text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_set_hero(p_token, p_hero); end $$;

create or replace function public.kid_set_weapon(p_token text, p_weapon text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_set_weapon(p_token, p_weapon); end $$;

create or replace function public.kid_sync_rewards(p_token text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_sync_rewards(p_token) $$;

revoke all on function private.weapon_rules() from public, anon, authenticated;
revoke all on function private.kid_stats(uuid) from public, anon, authenticated;
revoke all on function private.weapon_value(text, jsonb) from public, anon, authenticated;
revoke all on function private.unlocked_weapon_count(jsonb) from public, anon, authenticated;
revoke all on function private.monster_kinds() from public, anon, authenticated;
revoke all on function private.sync_kid_rewards(uuid) from public, anon, authenticated;
revoke all on function private.kid_hero_board(text) from public, anon, authenticated;
revoke all on function private.kid_set_hero(text, text) from public, anon, authenticated;
revoke all on function private.kid_set_weapon(text, text) from public, anon, authenticated;
revoke all on function private.kid_sync_rewards(text) from public, anon, authenticated;
revoke all on function public.kid_hero_board(text) from public, anon, authenticated;
revoke all on function public.kid_set_hero(text, text) from public, anon, authenticated;
revoke all on function public.kid_set_weapon(text, text) from public, anon, authenticated;
revoke all on function public.kid_sync_rewards(text) from public, anon, authenticated;

grant execute on function private.kid_hero_board(text) to anon, authenticated;
grant execute on function private.kid_set_hero(text, text) to anon, authenticated;
grant execute on function private.kid_set_weapon(text, text) to anon, authenticated;
grant execute on function private.kid_sync_rewards(text) to anon, authenticated;
grant execute on function public.kid_hero_board(text) to anon, authenticated;
grant execute on function public.kid_set_hero(text, text) to anon, authenticated;
grant execute on function public.kid_set_weapon(text, text) to anon, authenticated;
grant execute on function public.kid_sync_rewards(text) to anon, authenticated;

create or replace function private.set_daily_active(p_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  update public.chore_templates
  set active = coalesce(p_on, false)
  where id = p_id and household_id = hid and kind = 'daily';
  if not found then
    raise exception 'chore not found';
  end if;
  if coalesce(p_on, false) then
    perform private.ensure_daily(hid);
  else
    delete from public.chores
    where template_id = p_id and household_id = hid and status = 'open';
  end if;
end;
$$;

create or replace function private.reject_chore(p_chore uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  chore public.chores%rowtype;
  kname text;
begin
  select * into chore
  from public.chores
  where id = p_chore and household_id = hid and status = 'submitted';
  if chore.id is null then
    raise exception 'nothing to reject';
  end if;
  update public.chores
  set status = 'open', verdict = 'flee'
  where id = chore.id;
  select name into kname from public.kids where id = chore.kid_id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, chore.kid_id, coalesce(kname, 'A kid') || ' was sent back on ' || chore.title || '.');
end;
$$;

create or replace function private.undo_approval(p_chore uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  chore public.chores%rowtype;
  kname text;
begin
  select * into chore
  from public.chores
  where id = p_chore and household_id = hid and status = 'approved';
  if chore.id is null then
    raise exception 'nothing to undo';
  end if;
  update public.kids
  set points = greatest(0, points - chore.points),
      cash_cents = greatest(0, cash_cents - chore.cash_cents),
      minutes = greatest(0, minutes - chore.minutes)
  where id = chore.kid_id;
  update public.chores
  set status = 'submitted', approved_at = null
  where id = chore.id;
  delete from public.kid_rewards where kid_id = chore.kid_id;
  perform private.sync_kid_rewards(chore.kid_id);
  if coalesce(private.weapon_value((select weapon from public.kids where id = chore.kid_id), private.kid_stats(chore.kid_id)), 0)
     < coalesce((select goal from private.weapon_rules() where key = (select weapon from public.kids where id = chore.kid_id)), 1) then
    update public.kids set weapon = 'broom' where id = chore.kid_id;
  end if;
  select name into kname from public.kids where id = chore.kid_id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, chore.kid_id, 'Approval undone for ' || coalesce(kname, 'a kid') || ' on ' || chore.title || '.');
end;
$$;

create or replace function private.reset_kid_progress(p_kid uuid)
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
  delete from public.activity where kid_id = p_kid and household_id = hid;
  delete from public.kid_rewards where kid_id = p_kid;
  update public.kids
  set hero = 'knight',
      weapon = 'broom',
      progress_reset_at = now()
  where id = p_kid;
  insert into public.activity (household_id, kid_id, body)
  values (hid, p_kid, kname || ' was reset. Hero, achievements, and the log start over.');
end;
$$;

create or replace function private.kid_ack_verdict(p_token text, p_chore uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  update public.chores
  set verdict = null
  where id = p_chore and kid_id = kid and verdict = 'flee';
end;
$$;

create or replace function public.set_daily_active(p_id uuid, p_on boolean)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.set_daily_active(p_id, p_on); end $$;

create or replace function public.reject_chore(p_chore uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.reject_chore(p_chore); end $$;

create or replace function public.undo_approval(p_chore uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.undo_approval(p_chore); end $$;

create or replace function public.reset_kid_progress(p_kid uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.reset_kid_progress(p_kid); end $$;

create or replace function public.kid_ack_verdict(p_token text, p_chore uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_ack_verdict(p_token, p_chore); end $$;

revoke all on function private.set_daily_active(uuid, boolean) from public, anon, authenticated;
revoke all on function private.reject_chore(uuid) from public, anon, authenticated;
revoke all on function private.undo_approval(uuid) from public, anon, authenticated;
revoke all on function private.reset_kid_progress(uuid) from public, anon, authenticated;
revoke all on function private.kid_ack_verdict(text, uuid) from public, anon, authenticated;
revoke all on function public.set_daily_active(uuid, boolean) from public, anon, authenticated;
revoke all on function public.reject_chore(uuid) from public, anon, authenticated;
revoke all on function public.undo_approval(uuid) from public, anon, authenticated;
revoke all on function public.reset_kid_progress(uuid) from public, anon, authenticated;
revoke all on function public.kid_ack_verdict(text, uuid) from public, anon, authenticated;

grant execute on function private.set_daily_active(uuid, boolean) to authenticated;
grant execute on function private.reject_chore(uuid) to authenticated;
grant execute on function private.undo_approval(uuid) to authenticated;
grant execute on function private.reset_kid_progress(uuid) to authenticated;
grant execute on function private.kid_ack_verdict(text, uuid) to anon, authenticated;
grant execute on function public.set_daily_active(uuid, boolean) to authenticated;
grant execute on function public.reject_chore(uuid) to authenticated;
grant execute on function public.undo_approval(uuid) to authenticated;
grant execute on function public.reset_kid_progress(uuid) to authenticated;
grant execute on function public.kid_ack_verdict(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';

create or replace function private.toronto_minute()
returns integer
language sql
stable
set search_path = ''
as $$
  select (
    extract(hour from timezone('America/Toronto', now()))::integer * 60
    + extract(minute from timezone('America/Toronto', now()))::integer
  )
$$;

create or replace function private.section_is_open(p_start integer, p_end integer, p_now integer default null)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when p_start is null or p_end is null then true
    when p_start = p_end then true
    when p_start < p_end then coalesce(p_now, 0) >= p_start and coalesce(p_now, 0) < p_end
    else coalesce(p_now, 0) >= p_start or coalesce(p_now, 0) < p_end
  end
$$;

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
  if raw !~ '^[0-2]?[0-9]:[0-5][0-9]$' then
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

create or replace function private.add_chore_section(p_title text, p_start text, p_end text)
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
begin
  if title is null or title = '' then
    raise exception 'section name required';
  end if;
  select coalesce(max(sort_order), -1) + 1 into next_ord
  from public.chore_sections where household_id = hid;
  insert into public.chore_sections (household_id, title, start_minute, end_minute, sort_order)
  values (hid, title, private.parse_clock(p_start), private.parse_clock(p_end), next_ord)
  returning id into sid;
  return sid;
end;
$$;

create or replace function private.remove_chore_section(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  update public.chore_templates
  set section_id = null
  where section_id = p_id and household_id = hid;
  delete from public.chore_sections
  where id = p_id and household_id = hid;
  if not found then
    raise exception 'section not found';
  end if;
end;
$$;

create or replace function private.reorder_chore_sections(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  if p_ids is null then
    return;
  end if;
  update public.chore_sections s
  set sort_order = ranked.n::integer - 1
  from unnest(p_ids) with ordinality as ranked(id, n)
  where s.id = ranked.id and s.household_id = hid;
end;
$$;

create or replace function private.reorder_chore_templates(p_ids uuid[], p_section uuid default null, p_kind text default 'daily')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  kind text := coalesce(nullif(p_kind, ''), 'daily');
  section uuid := p_section;
begin
  if kind not in ('daily', 'special') then
    raise exception 'bad kind';
  end if;
  if kind = 'special' then
    section := null;
  elsif section is not null and not exists (
    select 1 from public.chore_sections where id = section and household_id = hid
  ) then
    raise exception 'section not found';
  end if;
  if p_ids is null then
    return;
  end if;
  if exists (
    select 1
    from unnest(p_ids) as x(id)
    where not exists (
      select 1 from public.chore_templates t
      where t.id = x.id and t.household_id = hid and t.kind = kind
    )
  ) then
    raise exception 'chore not found';
  end if;
  update public.chore_templates t
  set section_id = case when kind = 'daily' then section else t.section_id end,
      sort_order = ranked.n::integer - 1
  from unnest(p_ids) with ordinality as ranked(id, n)
  where t.id = ranked.id and t.household_id = hid and t.kind = kind;
end;
$$;

create or replace function public.add_chore_section(p_title text, p_start text, p_end text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_chore_section(p_title, p_start, p_end) $$;

create or replace function public.remove_chore_section(p_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.remove_chore_section(p_id); end $$;

create or replace function public.reorder_chore_sections(p_ids uuid[])
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.reorder_chore_sections(p_ids); end $$;

create or replace function public.reorder_chore_templates(p_ids uuid[], p_section uuid default null, p_kind text default 'daily')
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.reorder_chore_templates(p_ids, p_section, p_kind); end $$;

revoke all on function private.add_chore_section(text, text, text) from public, anon, authenticated;
revoke all on function private.remove_chore_section(uuid) from public, anon, authenticated;
revoke all on function private.reorder_chore_sections(uuid[]) from public, anon, authenticated;
revoke all on function private.reorder_chore_templates(uuid[], uuid, text) from public, anon, authenticated;
revoke all on function private.add_daily_chore(text, integer, text, uuid) from public, anon, authenticated;
revoke all on function public.add_chore_section(text, text, text) from public, anon, authenticated;
revoke all on function public.remove_chore_section(uuid) from public, anon, authenticated;
revoke all on function public.reorder_chore_sections(uuid[]) from public, anon, authenticated;
revoke all on function public.reorder_chore_templates(uuid[], uuid, text) from public, anon, authenticated;
revoke all on function public.add_daily_chore(text, integer, text, uuid) from public, anon, authenticated;

grant execute on function private.add_chore_section(text, text, text) to authenticated;
grant execute on function private.remove_chore_section(uuid) to authenticated;
grant execute on function private.reorder_chore_sections(uuid[]) to authenticated;
grant execute on function private.reorder_chore_templates(uuid[], uuid, text) to authenticated;
grant execute on function private.add_daily_chore(text, integer, text, uuid) to authenticated;
grant execute on function public.add_chore_section(text, text, text) to authenticated;
grant execute on function public.remove_chore_section(uuid) to authenticated;
grant execute on function public.reorder_chore_sections(uuid[]) to authenticated;
grant execute on function public.reorder_chore_templates(uuid[], uuid, text) to authenticated;
grant execute on function public.add_daily_chore(text, integer, text, uuid) to authenticated;
notify pgrst, 'reload schema';
