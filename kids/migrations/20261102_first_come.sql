-- First come, first served tasks.
-- A priority (daily) task or a bonus task can be flagged first_come. The first kid to mark it done
-- keeps it; the other kids' open copies disappear. If a parent sends it back, the others get it again.

alter table public.chore_templates add column if not exists first_come boolean not null default false;

-- Turn the flag on or off.
create or replace function private.set_chore_first_come(p_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  want boolean := coalesce(p_on, false);
begin
  update public.chore_templates
  set first_come = want
  where id = p_id and household_id = hid and kind in ('daily', 'special');
  if not found then
    raise exception 'chore not found';
  end if;
  if want then
    -- Someone may have already claimed it: clear everyone else's open copy.
    delete from public.chores o
    where o.template_id = p_id and o.household_id = hid and o.status = 'open'
      and exists (
        select 1 from public.chores c
        where c.template_id = p_id and c.id <> o.id
          and c.chore_day is not distinct from o.chore_day
          and c.status in ('submitted', 'approved')
      );
  else
    perform private.ensure_daily(hid);
    insert into public.chores (household_id, kid_id, template_id, title, points, sprite)
    select hid, k.id, t.id, t.title, t.points, t.sprite
    from public.chore_templates t
    join public.kids k on k.household_id = t.household_id and (t.assignee_id is null or t.assignee_id = k.id)
    where t.id = p_id and t.kind = 'special'
      and not exists (select 1 from public.chores c where c.template_id = t.id and c.kid_id = k.id)
    on conflict do nothing;
  end if;
end;
$$;

create or replace function public.set_chore_first_come(p_id uuid, p_on boolean)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.set_chore_first_come(p_id, p_on); end $$;

revoke all on function private.set_chore_first_come(uuid, boolean) from public, anon, authenticated;
revoke all on function public.set_chore_first_come(uuid, boolean) from public, anon, authenticated;
grant execute on function private.set_chore_first_come(uuid, boolean) to authenticated;
grant execute on function public.set_chore_first_come(uuid, boolean) to authenticated;

-- Turning Priority off on a daily task also ends first come, first served.
create or replace function private.set_chore_priority(p_id uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
begin
  update public.chore_templates
  set priority = coalesce(p_on, false),
      first_come = case when kind = 'daily' and not coalesce(p_on, false) then false else first_come end
  where id = p_id and household_id = hid;
  if not found then
    raise exception 'chore not found';
  end if;
  perform private.ensure_daily(hid);
end;
$$;

-- Daily chores: a claimed first-come task is not handed out again today.
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
  left join public.chore_sections s on s.id = t.section_id
  where k.household_id = p_household
    and (s.id is null or private.section_applies(s.days, s.kid_ids, k.id, today))
    and not (
      t.first_come and exists (
        select 1 from public.chores c
        where c.template_id = t.id and c.chore_day = today and c.status in ('submitted', 'approved')
      )
    )
  on conflict (template_id, kid_id, chore_day) do nothing;
end;
$$;

-- A kid marks a task done: the winner of a first-come task takes it from everyone else.
create or replace function private.kid_mark_done(p_token text, p_chore uuid, p_proof_path text)
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
  cday date;
  tpl uuid;
  fc boolean;
  proof text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  if proof is null then
    raise exception 'photo required';
  end if;
  if split_part(proof, '/', 1) is distinct from p_chore::text then
    raise exception 'photo required';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'chore-proofs' and o.name = proof
  ) then
    raise exception 'photo required';
  end if;
  if private.priority_open(kid) and not exists (
    select 1 from public.chores c
    join public.chore_templates t on t.id = c.template_id
    where c.id = p_chore and c.kid_id = kid and t.priority
  ) then
    raise exception 'priority first';
  end if;
  select c.template_id, coalesce(t.first_come, false) into tpl, fc
  from public.chores c
  left join public.chore_templates t on t.id = c.template_id
  where c.id = p_chore and c.kid_id = kid;
  if fc then
    perform pg_advisory_xact_lock(hashtext(tpl::text));
  end if;
  update public.chores
  set status = 'submitted', verdict = null, proof_path = proof
  where id = p_chore and kid_id = kid and status = 'open'
  returning chores.title, chores.household_id, chores.chore_day into chore_title, hid, cday;
  if chore_title is null then
    raise exception 'chore not found';
  end if;
  if fc then
    delete from public.chores
    where template_id = tpl and id <> p_chore and status = 'open'
      and chore_day is not distinct from cday;
  end if;
  select name into kname from public.kids where id = kid;
  insert into public.activity (household_id, kid_id, body)
  values (hid, kid, kname || ' marked ' || chore_title || ' done.');
end;
$$;

-- A parent sends a first-come task back: it goes back to the other kids too.
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
  set status = 'open', verdict = 'flee', proof_path = null
  where id = chore.id;
  if chore.template_id is not null and exists (
    select 1 from public.chore_templates where id = chore.template_id and first_come
  ) and not exists (
    select 1 from public.chores c
    where c.template_id = chore.template_id and c.id <> chore.id
      and c.chore_day is not distinct from chore.chore_day
      and c.status in ('submitted', 'approved')
  ) then
    if chore.chore_day is null then
      insert into public.chores (household_id, kid_id, template_id, title, points, sprite)
      select hid, k.id, t.id, t.title, t.points, t.sprite
      from public.chore_templates t
      join public.kids k on k.household_id = t.household_id and (t.assignee_id is null or t.assignee_id = k.id)
      where t.id = chore.template_id
        and not exists (select 1 from public.chores c where c.template_id = t.id and c.kid_id = k.id and c.chore_day is null)
      on conflict do nothing;
    else
      perform private.ensure_daily(hid);
    end if;
  end if;
  select name into kname from public.kids where id = chore.kid_id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, chore.kid_id, coalesce(kname, 'A kid') || ' was sent back on ' || chore.title || '.');
end;
$$;

-- Let kids see that a task is first come, first served.
do $do$
declare
  def text := pg_get_functiondef('private.kid_snapshot(text)'::regprocedure);
begin
  if def not like '%''first_come''%' then
    def := replace(
      def,
      '''priority'', coalesce(t.priority, false)' || chr(10),
      '''priority'', coalesce(t.priority, false),' || chr(10) || '        ''first_come'', coalesce(t.first_come, false)' || chr(10)
    );
    if def not like '%''first_come''%' then
      raise exception 'kid_snapshot patch did not match';
    end if;
    execute def;
  end if;
end
$do$;

notify pgrst, 'reload schema';
