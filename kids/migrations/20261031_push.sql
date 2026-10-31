-- Persistent kid sessions + Web Push subscription storage for PWA notifications.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  parent_id uuid references public.parents (id) on delete cascade,
  kid_id uuid references public.kids (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_subscriptions_owner check (parent_id is not null or kid_id is not null),
  constraint push_subscriptions_endpoint unique (endpoint)
);

create index if not exists push_subscriptions_household_idx on public.push_subscriptions (household_id);
create index if not exists push_subscriptions_parent_idx on public.push_subscriptions (parent_id);
create index if not exists push_subscriptions_kid_idx on public.push_subscriptions (kid_id);

alter table public.push_subscriptions enable row level security;
revoke all on table public.push_subscriptions from public, anon, authenticated;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated
  using (household_id = private.household_id() and parent_id is not null and parent_id in (
    select id from public.parents where user_id = auth.uid()
  ));

create table if not exists private.push_vapid (
  id integer primary key default 1 check (id = 1),
  public_key text not null,
  private_key text not null,
  subject text not null default 'mailto:family@getsthejobdone.ca'
);

revoke all on table private.push_vapid from public, anon, authenticated;

insert into private.push_vapid (id, public_key, private_key, subject)
values (
  1,
  'BIXCdxvJlIoW_TcOLd0Z8Ug65kN6pa-4ds19Kwyo6HaTZlm9mUf5l6k4RlIz_TZrDe9W6ED_3WP8vYkK4cezEKc',
  'PGaDKSsoF1qSyrJ7kO9NbAZMHlmDdEzO-VhGGpDSvjU',
  'mailto:family@getsthejobdone.ca'
)
on conflict (id) do update
set public_key = excluded.public_key,
    private_key = excluded.private_key,
    subject = excluded.subject;

create or replace function public.push_vapid_keys()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'denied';
  end if;
  return (
    select jsonb_build_object(
      'publicKey', public_key,
      'privateKey', private_key,
      'subject', subject
    )
    from private.push_vapid
    where id = 1
  );
end;
$$;

revoke all on function public.push_vapid_keys() from public, anon, authenticated;
grant execute on function public.push_vapid_keys() to service_role;

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
  values (p_kid, encode(extensions.digest(token, 'sha256'), 'hex'), now() + interval '400 days');
  return token;
end;
$$;

create or replace function private.kid_sign_out(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from private.kid_sessions
  where token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
end;
$$;

create or replace function public.kid_sign_out(p_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.kid_sign_out(p_token);
end;
$$;

grant execute on function public.kid_sign_out(text) to anon, authenticated;

create or replace function private.save_parent_push(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  pid uuid;
  sid uuid;
begin
  select id into pid from public.parents where user_id = auth.uid() and household_id = hid;
  if pid is null then
    raise exception 'parent not found';
  end if;
  insert into public.push_subscriptions (household_id, parent_id, kid_id, endpoint, p256dh, auth, user_agent, updated_at)
  values (hid, pid, null, p_endpoint, p_p256dh, p_auth, nullif(btrim(coalesce(p_user_agent, '')), ''), now())
  on conflict (endpoint) do update
  set household_id = excluded.household_id,
      parent_id = excluded.parent_id,
      kid_id = null,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = now()
  returning id into sid;
  return sid;
end;
$$;

create or replace function public.save_parent_push(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.save_parent_push(p_endpoint, p_p256dh, p_auth, p_user_agent);
end;
$$;

grant execute on function public.save_parent_push(text, text, text, text) to authenticated;

create or replace function private.save_kid_push(
  p_token text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  hid uuid;
  sid uuid;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select household_id into hid from public.kids where id = kid;
  insert into public.push_subscriptions (household_id, parent_id, kid_id, endpoint, p256dh, auth, user_agent, updated_at)
  values (hid, null, kid, p_endpoint, p_p256dh, p_auth, nullif(btrim(coalesce(p_user_agent, '')), ''), now())
  on conflict (endpoint) do update
  set household_id = excluded.household_id,
      parent_id = null,
      kid_id = excluded.kid_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      updated_at = now()
  returning id into sid;
  return sid;
end;
$$;

create or replace function public.save_kid_push(
  p_token text,
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
begin
  return private.save_kid_push(p_token, p_endpoint, p_p256dh, p_auth, p_user_agent);
end;
$$;

grant execute on function public.save_kid_push(text, text, text, text, text) to anon, authenticated;

create or replace function private.remove_push(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.household_id();
  kid uuid;
begin
  if hid is not null then
    delete from public.push_subscriptions
    where endpoint = p_endpoint
      and household_id = hid
      and parent_id in (select id from public.parents where user_id = auth.uid());
    return;
  end if;
end;
$$;

create or replace function public.remove_push(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.remove_push(p_endpoint);
end;
$$;

grant execute on function public.remove_push(text) to authenticated;

create or replace function private.remove_kid_push(p_token text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
begin
  if kid is null then
    return;
  end if;
  delete from public.push_subscriptions where kid_id = kid and endpoint = p_endpoint;
end;
$$;

create or replace function public.remove_kid_push(p_token text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.remove_kid_push(p_token, p_endpoint);
end;
$$;

grant execute on function public.remove_kid_push(text, text) to anon, authenticated;

create or replace function public.list_push_targets(
  p_household uuid,
  p_audience text,
  p_kid_ids uuid[] default null
)
returns table (
  endpoint text,
  p256dh text,
  auth text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'denied';
  end if;
  if p_audience = 'parents' then
    return query
      select s.endpoint, s.p256dh, s.auth
      from public.push_subscriptions s
      where s.household_id = p_household and s.parent_id is not null;
  elsif p_audience = 'kids' then
    return query
      select s.endpoint, s.p256dh, s.auth
      from public.push_subscriptions s
      where s.household_id = p_household
        and s.kid_id is not null
        and (p_kid_ids is null or s.kid_id = any (p_kid_ids));
  end if;
end;
$$;

revoke all on function public.list_push_targets(uuid, text, uuid[]) from public, anon, authenticated;
grant execute on function public.list_push_targets(uuid, text, uuid[]) to service_role;

create or replace function public.resolve_push_caller(p_kid_token text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid;
  hid uuid;
  pid uuid;
  pname text;
  kname text;
begin
  if auth.role() = 'service_role' and p_kid_token is null then
    raise exception 'caller required';
  end if;
  if p_kid_token is not null and btrim(p_kid_token) <> '' then
    kid := private.kid_from_token(p_kid_token);
    if kid is null then
      raise exception 'sign in again';
    end if;
    select household_id, name into hid, kname from public.kids where id = kid;
    return jsonb_build_object(
      'role', 'kid',
      'householdId', hid,
      'kidId', kid,
      'name', kname
    );
  end if;
  select p.id, p.household_id, p.name into pid, hid, pname
  from public.parents p
  where p.user_id = auth.uid();
  if pid is null then
    raise exception 'sign in again';
  end if;
  return jsonb_build_object(
    'role', 'parent',
    'householdId', hid,
    'parentId', pid,
    'name', pname
  );
end;
$$;

revoke all on function public.resolve_push_caller(text) from public;
grant execute on function public.resolve_push_caller(text) to anon, authenticated, service_role;
