-- A parent's approval now waits for the kid to watch the monster fight.
-- Before, the kid's device only knew about a battle if it had already seen the chore as "submitted".
-- If the parent approved it on another device (or between polls), the kid saw nothing.
-- Now approving a chore marks it fight_pending, the kid's app plays the fight and then acknowledges it.

alter table public.chores add column if not exists fight_pending boolean not null default false;

create or replace function private.chore_fight_pending()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    new.fight_pending := true;
  elsif new.status <> 'approved' then
    new.fight_pending := false;
  end if;
  return new;
end;
$$;

drop trigger if exists chores_fight_pending on public.chores;
create trigger chores_fight_pending
  before update of status on public.chores
  for each row execute function private.chore_fight_pending();

create or replace function private.kid_pending_fights(p_token text)
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
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', c.id, 'title', c.title, 'points', c.points, 'sprite', c.sprite
    ) order by c.approved_at)
    from public.chores c
    where c.kid_id = kid
      and c.status = 'approved'
      and c.fight_pending
      and c.approved_at > now() - interval '3 days'
  ), '[]'::jsonb);
end;
$$;

create or replace function private.kid_ack_fight(p_token text, p_chore uuid)
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
  set fight_pending = false
  where id = p_chore and kid_id = kid and fight_pending;
end;
$$;

create or replace function public.kid_pending_fights(p_token text)
returns jsonb language plpgsql security invoker set search_path = ''
as $$ begin return private.kid_pending_fights(p_token); end $$;

create or replace function public.kid_ack_fight(p_token text, p_chore uuid)
returns void language plpgsql security invoker set search_path = ''
as $$ begin perform private.kid_ack_fight(p_token, p_chore); end $$;

revoke all on function private.chore_fight_pending() from public, anon, authenticated;
revoke all on function private.kid_pending_fights(text) from public, anon, authenticated;
revoke all on function private.kid_ack_fight(text, uuid) from public, anon, authenticated;
revoke all on function public.kid_pending_fights(text) from public, anon, authenticated;
revoke all on function public.kid_ack_fight(text, uuid) from public, anon, authenticated;

grant execute on function private.kid_pending_fights(text) to anon, authenticated;
grant execute on function private.kid_ack_fight(text, uuid) to anon, authenticated;
grant execute on function public.kid_pending_fights(text) to anon, authenticated;
grant execute on function public.kid_ack_fight(text, uuid) to anon, authenticated;

notify pgrst, 'reload schema';
