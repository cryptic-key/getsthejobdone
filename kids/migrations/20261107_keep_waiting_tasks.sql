-- Tasks marked done on an earlier day stay on the kid's board until a parent approves or rejects them.
-- A past-day task that gets rejected still plays the monster running off, but the kid can't redo it.

-- Old "ran off" verdicts nobody watched would otherwise replay once past days are included.
update public.chores
set verdict = null
where verdict = 'flee'
  and chore_day is not null
  and chore_day < (now() at time zone 'America/Toronto')::date;

do $do$
declare
  def text := pg_get_functiondef('private.kid_snapshot(text)'::regprocedure);
begin
  if def like '%''chore_day'', c.chore_day%' then
    return;
  end if;
  def := replace(
    def,
    '''special'', (c.chore_day is null),',
    '''special'', (c.chore_day is null),' || chr(10) || '        ''chore_day'', c.chore_day,'
  );
  def := replace(
    def,
    'and (c.chore_day is null or c.chore_day = today)',
    'and (c.chore_day is null or c.chore_day = today or c.status = ''submitted'' or c.verdict = ''flee'')'
  );
  if def not like '%''chore_day'', c.chore_day%' or def not like '%c.chore_day = today or c.status = ''submitted''%' then
    raise exception 'kid_snapshot keep-waiting patch did not match';
  end if;
  execute def;
end
$do$;

notify pgrst, 'reload schema';
