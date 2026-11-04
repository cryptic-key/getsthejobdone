-- Karate Master monster. Keep in sync with SPRITES in kids/battle.js.
create or replace function private.monster_kinds()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['dust','sleep','dry','breakfast','dinner','lunchmade','bath','bed','shoes','pack','dishes','teeth','laundry','toys','reading','pet','plants','table','trash','counters','towels','bookshelf','lunch','coats','groceries','homework','dressed','petbrush','leaves','snow','outside','wood','basketball','bus','repair','helping','babysit','shirts','karate']
$$;

alter table public.chores drop constraint if exists chores_sprite_check;
alter table public.chores add constraint chores_sprite_check check (sprite = any (array['dust','sleep','dry','breakfast','dinner','lunchmade','bath','bed','shoes','pack','dishes','teeth','laundry','toys','reading','pet','plants','table','trash','counters','towels','bookshelf','lunch','coats','groceries','homework','dressed','petbrush','leaves','snow','outside','wood','basketball','bus','repair','helping','babysit','shirts','karate']));
alter table public.chore_templates drop constraint if exists chore_templates_sprite_check;
alter table public.chore_templates add constraint chore_templates_sprite_check check (sprite = any (array['dust','sleep','dry','breakfast','dinner','lunchmade','bath','bed','shoes','pack','dishes','teeth','laundry','toys','reading','pet','plants','table','trash','counters','towels','bookshelf','lunch','coats','groceries','homework','dressed','petbrush','leaves','snow','outside','wood','basketball','bus','repair','helping','babysit','shirts','karate']));

notify pgrst, 'reload schema';
