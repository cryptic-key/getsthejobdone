-- Treasure savings: each kid can bank coins toward any Market item, a bit at a time.
-- When the bank reaches the cost it becomes a normal Ask (coins on hold for a parent).
-- Removing an item gives every kid their banked coins back.

create table if not exists public.item_savings (
  household_id uuid not null references public.households (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  item_id uuid not null references public.shop_items (id) on delete cascade,
  amount integer not null default 0 check (amount >= 0),
  updated_at timestamptz not null default now(),
  primary key (kid_id, item_id)
);
create index if not exists item_savings_item_idx on public.item_savings (item_id);
create index if not exists item_savings_household_idx on public.item_savings (household_id);

alter table public.item_savings enable row level security;
revoke all on table public.item_savings from public, anon, authenticated;
grant select on public.item_savings to authenticated;
drop policy if exists item_savings_select on public.item_savings;
create policy item_savings_select on public.item_savings
  for select to authenticated using (household_id = private.household_id());

create or replace function private.kid_item_savings(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object('item_id', s.item_id, 'amount', s.amount))
    from public.item_savings s
    where s.kid_id = kid and s.amount > 0
  ), '[]'::jsonb);
end;
$$;

-- Kid banks coins toward an item. The amount is capped at what's still needed.
create or replace function private.kid_save_item(p_token text, p_item uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  item public.shop_items%rowtype;
  so_far integer;
  give integer;
  left_points integer;
  filled boolean;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid for update;
  select * into item from public.shop_items where id = p_item and household_id = child.household_id;
  if item.id is null then
    raise exception 'item not found';
  end if;
  if exists (
    select 1 from public.requests
    where kid_id = kid and item_id = item.id and status = 'pending'
  ) then
    raise exception 'already asked';
  end if;
  if coalesce(p_amount, 0) < 1 then
    raise exception 'enter an amount';
  end if;
  select coalesce(sum(amount), 0) into so_far from public.item_savings where kid_id = kid and item_id = item.id;
  give := least(p_amount, item.cost - so_far);
  if give < 1 then
    raise exception 'already saved enough';
  end if;
  if child.points < give then
    raise exception 'not enough points';
  end if;
  update public.kids set points = points - give where id = kid returning points into left_points;
  filled := so_far + give >= item.cost;
  if filled then
    delete from public.item_savings where kid_id = kid and item_id = item.id;
    insert into public.requests (household_id, kid_id, item_id, cost)
    values (child.household_id, kid, item.id, item.cost);
    insert into public.activity (household_id, kid_id, body)
    values (child.household_id, kid, child.name || ' saved up and asked for ' || item.name || '.');
  else
    insert into public.item_savings (household_id, kid_id, item_id, amount)
    values (child.household_id, kid, item.id, give)
    on conflict (kid_id, item_id) do update
      set amount = public.item_savings.amount + excluded.amount, updated_at = now();
    insert into public.activity (household_id, kid_id, body)
    values (child.household_id, kid, child.name || ' saved ' || give || ' coins toward ' || item.name || '.');
  end if;
  return jsonb_build_object('points', left_points, 'given', give, 'saved', so_far + give, 'cost', item.cost, 'asked', filled);
end;
$$;

-- Asking uses banked coins first, then the rest from the kid's wallet.
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
  saved integer;
  need integer;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid for update;
  select * into item from public.shop_items where id = p_item and household_id = child.household_id;
  if item.id is null then
    raise exception 'item not found';
  end if;
  select coalesce(sum(amount), 0) into saved from public.item_savings where kid_id = kid and item_id = item.id;
  need := greatest(item.cost - saved, 0);
  if child.points < need then
    raise exception 'not enough points';
  end if;
  if exists (
    select 1 from public.requests
    where kid_id = kid and item_id = item.id and status = 'pending'
  ) then
    raise exception 'already asked';
  end if;
  update public.kids set points = points - need where id = kid;
  delete from public.item_savings where kid_id = kid and item_id = item.id;
  insert into public.requests (household_id, kid_id, item_id, cost)
  values (child.household_id, kid, item.id, item.cost);
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' asked for ' || item.name || '.');
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
  update public.kids k
  set points = k.points + s.amount
  from public.item_savings s
  where s.item_id = p_item and s.household_id = hid and k.id = s.kid_id;
  delete from public.shop_items where id = p_item and household_id = hid;
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
  delete from public.requests where kid_id = p_kid and household_id = hid;
  delete from public.item_savings where kid_id = p_kid and household_id = hid;
  delete from public.chores where kid_id = p_kid and household_id = hid;
  delete from public.activity where kid_id = p_kid and household_id = hid;
  delete from public.kid_rewards where kid_id = p_kid;
  update public.kids
  set hero = 'knight',
      weapon = 'broom',
      pet = null,
      points = 0,
      cash_cents = 0,
      minutes = 0,
      hearts = 3,
      ground_progress = 0,
      grounded_until = null,
      warn_parent = null,
      warn_seq = 0,
      progress_reset_at = now()
  where id = p_kid and household_id = hid;
  insert into public.activity (household_id, kid_id, body)
  values (hid, p_kid, kname || '''s progress was reset.');
end;
$$;

create or replace function public.kid_item_savings(p_token text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_item_savings(p_token) $$;

create or replace function public.kid_save_item(p_token text, p_item uuid, p_amount integer)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_save_item(p_token, p_item, p_amount) $$;

revoke all on function private.kid_item_savings(text) from public, anon, authenticated;
revoke all on function private.kid_save_item(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.kid_item_savings(text) from public, anon, authenticated;
revoke all on function public.kid_save_item(text, uuid, integer) from public, anon, authenticated;
grant execute on function private.kid_item_savings(text) to anon, authenticated;
grant execute on function private.kid_save_item(text, uuid, integer) to anon, authenticated;
grant execute on function public.kid_item_savings(text) to anon, authenticated;
grant execute on function public.kid_save_item(text, uuid, integer) to anon, authenticated;

notify pgrst, 'reload schema';
