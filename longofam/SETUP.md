# Longo Family Adventure (/longofam)

A copy of `/kids` for the Longo family, with its own backend so the two families never see each other.
Only one account exists to start: parent **John**, door PIN **1234**.

## One-time backend setup

1. In the Supabase account that owns `/kids`, create a new project (e.g. "Longo Family", Canada region).
2. In that project's SQL editor, run these in order:
   1. `kids/schema.sql`
   2. `kids/migrations/20261031_push.sql`
   3. `longofam/setup-longo.sql`
3. Deploy the two edge functions from `supabase/functions/` to the new project, with JWT verification **off**
   (both check who's calling themselves):
   - `parent-pin`
   - `send-push`
4. Put the project's URL and publishable key into `longofam/config.js`.
5. Run `longofam/bump-version.sh` and push.

Until step 4 is done, the page shows an "almost ready" note instead of loading.

## Notes

- `/kids` and `/longofam` share a website, so this copy prefixes everything it saves in the browser
  (`storage-ns.js`). Signing in on one never signs you in or out of the other.
- John can add kids and other parents from the Family screen once he's signed in.
- Backend changes made for `/kids` later (new migrations) need running on the Longo project too.
