-- Family Rewards: a parent sets a shared reward and a coin goal (e.g. "Pizza night", 300 coins).
-- Kids chip in coins from the Market; the bar fills with each kid's colour.
-- Removing a reward before it is reached refunds every kid's coins.

create table if not exists public.family_rewards (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  goal integer not null check (goal > 0),
  status text not null default 'open' check (status in ('open', 'reached', 'claimed')),
  created_at timestamptz not null default now(),
  reached_at timestamptz,
  claimed_at timestamptz
);

create table if not exists public.family_contributions (
  id uuid primary key default gen_random_uuid(),
  reward_id uuid not null references public.family_rewards (id) on delete cascade,
  household_id uuid not null references public.households (id) on delete cascade,
  kid_id uuid not null references public.kids (id) on delete cascade,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists family_contributions_reward_idx on public.family_contributions (reward_id);

alter table public.family_rewards enable row level security;
alter table public.family_contributions enable row level security;
revoke all on table public.family_rewards from public, anon, authenticated;
revoke all on table public.family_contributions from public, anon, authenticated;
grant select on public.family_rewards to authenticated;
grant select on public.family_contributions to authenticated;
drop policy if exists family_rewards_select on public.family_rewards;
create policy family_rewards_select on public.family_rewards
  for select to authenticated using (household_id = private.household_id());
drop policy if exists family_contributions_select on public.family_contributions;
create policy family_contributions_select on public.family_contributions
  for select to authenticated using (household_id = private.household_id());

-- Rewards for one household, with each kid's share. Claimed rewards stay visible for 14 days.
create or replace function private.family_reward_rows(p_household uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'title', r.title,
    'goal', r.goal,
    'status', r.status,
    'created_at', r.created_at,
    'total', coalesce((select sum(c.amount) from public.family_contributions c where c.reward_id = r.id), 0),
    'shares', coalesce((
      select jsonb_agg(jsonb_build_object('kid_id', k.id, 'name', k.name, 'color', k.color, 'amount', s.amount) order by s.first_at)
      from (
        select c.kid_id, sum(c.amount)::int as amount, min(c.created_at) as first_at
        from public.family_contributions c
        where c.reward_id = r.id
        group by c.kid_id
      ) s
      join public.kids k on k.id = s.kid_id
    ), '[]'::jsonb)
  ) order by case r.status when 'open' then 0 when 'reached' then 1 else 2 end, r.created_at), '[]'::jsonb)
  from public.family_rewards r
  where r.household_id = p_household
    and (r.status <> 'claimed' or r.claimed_at > now() - interval '14 days')
$$;

create or replace function private.family_rewards()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return private.family_reward_rows(private.require_household());
end;
$$;

create or replace function private.kid_family_rewards(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  hid uuid;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select household_id into hid from public.kids where id = kid;
  return private.family_reward_rows(hid);
end;
$$;

create or replace function private.add_family_reward(p_title text, p_goal integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  rid uuid;
begin
  if nullif(btrim(coalesce(p_title, '')), '') is null then
    raise exception 'reward name required';
  end if;
  if coalesce(p_goal, 0) < 1 then
    raise exception 'goal must be at least 1';
  end if;
  insert into public.family_rewards (household_id, title, goal)
  values (hid, btrim(p_title), p_goal)
  returning id into rid;
  insert into public.activity (household_id, body)
  values (hid, 'New Family Reward: ' || btrim(p_title) || ' for ' || p_goal || ' coins.');
  return rid;
end;
$$;

-- Remove a reward. If it was never reached, every kid gets their coins back.
create or replace function private.remove_family_reward(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  reward public.family_rewards%rowtype;
begin
  select * into reward from public.family_rewards where id = p_id and household_id = hid for update;
  if reward.id is null then
    raise exception 'reward not found';
  end if;
  if reward.status = 'open' then
    update public.kids k
    set points = k.points + s.amount
    from (
      select kid_id, sum(amount)::int as amount
      from public.family_contributions
      where reward_id = reward.id
      group by kid_id
    ) s
    where k.id = s.kid_id;
  end if;
  delete from public.family_rewards where id = reward.id;
end;
$$;

-- Parent marks a reached reward as given.
create or replace function private.claim_family_reward(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid := private.require_household();
  reward public.family_rewards%rowtype;
begin
  select * into reward from public.family_rewards where id = p_id and household_id = hid for update;
  if reward.id is null then
    raise exception 'reward not found';
  end if;
  if reward.status <> 'reached' then
    raise exception 'goal not reached';
  end if;
  update public.family_rewards set status = 'claimed', claimed_at = now() where id = reward.id;
  insert into public.activity (household_id, body)
  values (hid, 'Family Reward unlocked: ' || reward.title || '!');
end;
$$;

-- Kid chips in coins. The amount is capped at what's still needed.
create or replace function private.kid_contribute(p_token text, p_reward uuid, p_amount integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kid uuid := private.kid_from_token(p_token);
  child public.kids%rowtype;
  reward public.family_rewards%rowtype;
  so_far integer;
  give integer;
  left_points integer;
begin
  if kid is null then
    raise exception 'sign in again';
  end if;
  select * into child from public.kids where id = kid for update;
  if private.is_grounded(child.grounded_until) then
    raise exception 'grounded';
  end if;
  select * into reward from public.family_rewards
  where id = p_reward and household_id = child.household_id
  for update;
  if reward.id is null then
    raise exception 'reward not found';
  end if;
  if reward.status <> 'open' then
    raise exception 'goal already reached';
  end if;
  if coalesce(p_amount, 0) < 1 then
    raise exception 'enter an amount';
  end if;
  select coalesce(sum(amount), 0) into so_far from public.family_contributions where reward_id = reward.id;
  give := least(p_amount, reward.goal - so_far);
  if give < 1 then
    raise exception 'goal already reached';
  end if;
  if child.points < give then
    raise exception 'not enough points';
  end if;
  update public.kids set points = points - give where id = kid returning points into left_points;
  insert into public.family_contributions (reward_id, household_id, kid_id, amount)
  values (reward.id, child.household_id, kid, give);
  insert into public.activity (household_id, kid_id, body)
  values (child.household_id, kid, child.name || ' put ' || give || ' coins into ' || reward.title || '.');
  if so_far + give >= reward.goal then
    update public.family_rewards set status = 'reached', reached_at = now() where id = reward.id;
    insert into public.activity (household_id, kid_id, body)
    values (child.household_id, kid, 'Goal reached: ' || reward.title || '! Time to collect.');
  end if;
  return jsonb_build_object('points', left_points, 'given', give, 'total', so_far + give, 'goal', reward.goal, 'reached', so_far + give >= reward.goal);
end;
$$;

create or replace function public.family_rewards()
returns jsonb language sql security invoker set search_path = ''
as $$ select private.family_rewards() $$;

create or replace function public.kid_family_rewards(p_token text)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_family_rewards(p_token) $$;

create or replace function public.add_family_reward(p_title text, p_goal integer)
returns uuid language sql security invoker set search_path = ''
as $$ select private.add_family_reward(p_title, p_goal) $$;

create or replace function public.remove_family_reward(p_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.remove_family_reward(p_id); end $$;

create or replace function public.claim_family_reward(p_id uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.claim_family_reward(p_id); end $$;

create or replace function public.kid_contribute(p_token text, p_reward uuid, p_amount integer)
returns jsonb language sql security invoker set search_path = ''
as $$ select private.kid_contribute(p_token, p_reward, p_amount) $$;

revoke all on function private.family_reward_rows(uuid) from public, anon, authenticated;
revoke all on function private.family_rewards() from public, anon, authenticated;
revoke all on function private.kid_family_rewards(text) from public, anon, authenticated;
revoke all on function private.add_family_reward(text, integer) from public, anon, authenticated;
revoke all on function private.remove_family_reward(uuid) from public, anon, authenticated;
revoke all on function private.claim_family_reward(uuid) from public, anon, authenticated;
revoke all on function private.kid_contribute(text, uuid, integer) from public, anon, authenticated;
revoke all on function public.family_rewards() from public, anon, authenticated;
revoke all on function public.kid_family_rewards(text) from public, anon, authenticated;
revoke all on function public.add_family_reward(text, integer) from public, anon, authenticated;
revoke all on function public.remove_family_reward(uuid) from public, anon, authenticated;
revoke all on function public.claim_family_reward(uuid) from public, anon, authenticated;
revoke all on function public.kid_contribute(text, uuid, integer) from public, anon, authenticated;

grant execute on function private.family_reward_rows(uuid) to anon, authenticated;
grant execute on function private.family_rewards() to authenticated;
grant execute on function private.kid_family_rewards(text) to anon, authenticated;
grant execute on function private.add_family_reward(text, integer) to authenticated;
grant execute on function private.remove_family_reward(uuid) to authenticated;
grant execute on function private.claim_family_reward(uuid) to authenticated;
grant execute on function private.kid_contribute(text, uuid, integer) to anon, authenticated;
grant execute on function public.family_rewards() to authenticated;
grant execute on function public.kid_family_rewards(text) to anon, authenticated;
grant execute on function public.add_family_reward(text, integer) to authenticated;
grant execute on function public.remove_family_reward(uuid) to authenticated;
grant execute on function public.claim_family_reward(uuid) to authenticated;
grant execute on function public.kid_contribute(text, uuid, integer) to anon, authenticated;

notify pgrst, 'reload schema';
