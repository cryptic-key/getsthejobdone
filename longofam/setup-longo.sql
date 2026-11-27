-- One-time setup for the Longo family (getsthejobdone.ca/longofam), inside the shared /kids project.
-- Run AFTER kids/migrations/20261127_family_door_code.sql.
-- Creates the "Longo Family" household (door code 'longofam') with one parent, John, door PIN 1234.
-- Safe to run twice: it stops if the Longo household already exists.

do $$
declare
  uid uuid := gen_random_uuid();
  pid uuid;
  login text := 'john.longo@example.com'; -- placeholder; John signs in with his PIN, no email is sent
begin
  if exists (select 1 from public.households where code = 'longofam') then
    raise notice 'The Longo family is already set up.';
    return;
  end if;

  -- The auth trigger (private.handle_new_parent) makes the household and the parent row
  -- from this metadata.
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated', login,
    extensions.crypt(encode(extensions.gen_random_bytes(24), 'hex'), extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    '{"name":"John","family_name":"Longo Family"}',
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), uid::text, uid,
    jsonb_build_object('sub', uid::text, 'email', login, 'email_verified', true),
    'email', now(), now(), now()
  );

  select id into pid from public.parents where user_id = uid;
  if pid is null then
    raise exception 'The parent row was not created.';
  end if;

  update public.households set code = 'longofam'
  where id = (select household_id from public.parents where id = pid);

  insert into private.parent_pins (parent_id, pin_hash)
  values (pid, extensions.crypt('1234', extensions.gen_salt('bf')));
  insert into private.parent_pin_guard (parent_id, failures, locked_until)
  values (pid, 0, null);
end;
$$;

notify pgrst, 'reload schema';
