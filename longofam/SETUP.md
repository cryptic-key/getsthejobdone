# Longo Family Adventure (/longofam)

A copy of `/kids` for the Longo family. It shares the `/kids` Supabase project, but the families never see
each other: each one is its own household, and the sign-in screen only shows one family.
Only one account exists to start: parent **John**, door PIN **1234**.

## How the families stay apart

- Parent screens and kid screens were already limited to the signed-in person's household.
- The sign-in screen (`list_players`, `list_kids`) now takes a family code
  (`kids/migrations/20261127_family_door_code.sql`). `/kids` sends no code and gets the first family, as before.
  `/longofam` sends `longofam` (set in `config.js`).
- `/kids` and `/longofam` are on the same website, so this copy prefixes everything it saves in the browser
  (`storage-ns.js`). Signing in on one never signs you in or out of the other.

## One-time setup (in the /kids project's SQL editor) — done 2026-11-27

1. Run `kids/migrations/20261127_family_door_code.sql`.
2. Run `longofam/setup-longo.sql`.
3. Set `SUPABASE_URL` in `longofam/config.js` to the `/kids` project URL, run `longofam/bump-version.sh`, and push.

If `SUPABASE_URL` is ever emptied, the page shows an "almost ready" note instead of loading.

## Notes

- John can add kids and other parents from the Family screen once he's signed in.
- The Longos share the project's free-plan usage with `/kids`.
