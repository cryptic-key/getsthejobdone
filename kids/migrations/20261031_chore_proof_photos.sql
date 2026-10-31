-- Kids must attach a photo when marking a chore done; parents see it on Approve.

alter table public.chores add column if not exists proof_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'chore-proofs',
  'chore-proofs',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists chore_proofs_insert on storage.objects;
create policy chore_proofs_insert on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'chore-proofs'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]+$'
  );

drop policy if exists chore_proofs_select on storage.objects;
create policy chore_proofs_select on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'chore-proofs');

drop policy if exists chore_proofs_update on storage.objects;
create policy chore_proofs_update on storage.objects
  for update to anon, authenticated
  using (bucket_id = 'chore-proofs')
  with check (bucket_id = 'chore-proofs');

drop function if exists public.kid_mark_done(text, uuid);
drop function if exists private.kid_mark_done(text, uuid);
drop function if exists public.kid_mark_done(text, uuid, text);
drop function if exists private.kid_mark_done(text, uuid, text);

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
  update public.chores
  set status = 'submitted', verdict = null, proof_path = proof
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

create or replace function public.kid_mark_done(p_token text, p_chore uuid, p_proof_path text)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_mark_done(p_token, p_chore, p_proof_path); end $$;

revoke all on function private.kid_mark_done(text, uuid, text) from public, anon, authenticated;
revoke all on function public.kid_mark_done(text, uuid, text) from public, anon, authenticated;
grant execute on function private.kid_mark_done(text, uuid, text) to anon, authenticated;
grant execute on function public.kid_mark_done(text, uuid, text) to anon, authenticated;

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
  select name into kname from public.kids where id = chore.kid_id;
  insert into public.activity (household_id, kid_id, body)
  values (hid, chore.kid_id, coalesce(kname, 'A kid') || ' was sent back on ' || chore.title || '.');
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
      'points_per_30', h.points_per_30,
      'unground_points', h.unground_points
    ),
    'kid', jsonb_build_object(
      'id', k.id,
      'name', k.name,
      'color', k.color,
      'points', k.points,
      'cash_cents', k.cash_cents,
      'minutes', k.minutes,
      'grounded_until', k.grounded_until,
      'hearts', k.hearts,
      'ground_progress', k.ground_progress,
      'warn_parent', k.warn_parent,
      'warn_seq', k.warn_seq,
      'hero', k.hero,
      'weapon', k.weapon,
      'pet', k.pet
    ),
    'chores', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'title', c.title, 'points', c.points,
        'cash_cents', c.cash_cents, 'minutes', c.minutes, 'status', c.status,
        'sprite', c.sprite,
        'verdict', c.verdict,
        'proof_path', c.proof_path,
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
          or c.verdict = 'flee'
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
    'pets', coalesce((
      select jsonb_agg(key order by earned_at)
      from public.kid_rewards
      where kid_id = k.id and kind = 'pet'
    ), '[]'::jsonb),
    'pet_prices', coalesce((
      select jsonb_object_agg(pet_key, cost)
      from public.pet_prices
      where household_id = k.household_id
    ), '{}'::jsonb),
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

notify pgrst, 'reload schema';
