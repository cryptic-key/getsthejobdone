-- Parent login queries pet_prices; revoke-all left the table with no SELECT grant.
grant select on public.pet_prices to authenticated;
