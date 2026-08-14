# The session bug

## What broke

`/api/v1/auth/me` returned 500 on every call. Everything you saw followed from
that: no session survived a refresh, `/play` was blank, and login appeared to
loop.

**Cause:** the badges migration dropped the `activeFlair` column from `User`,
but `routes/auth.ts` still selected it. Prisma throws on a select for a field
that does not exist, so every session bootstrap died.

It was my mistake in the stage-2 badges work — I replaced flairs *with* badges
when you had asked for flairs **and** profile badges. They are complementary:
you earn many badges (profile only) and display one of them beside your name.

## Fixed

- `activeFlair` restored on `User`, with a migration
  (`20260808200000_restore_active_flair`).
- It now lives in `TITLE_SELECT`, so it flows to every surface that renders a
  name rather than being selected ad hoc in one route.

## Why nothing caught it

`apps/api` cannot be typechecked here without a generated Prisma client, so a
select naming a dead column compiles fine and only fails at runtime. Every other
check passed while the app was completely broken.

**New: `pnpm check:schema`** (`scripts/check-prisma-selects.mjs`) cross-checks
every Prisma `select` against `schema.prisma` by parsing both. It resolves the
shared `TITLE_SELECT` and `PUBLIC_USER_SELECT` constants too, since the bug hid
inside one of those and a select-site-only check would have missed it.

I verified it works by deleting `activeFlair` from the schema again and
confirming it fails:

```
MISMATCH apps/api/src/lib/titles.ts:22  TITLE_SELECT selects User.activeFlair, not in the schema
```

This runs in my verification pass from now on.

## The blank page, separately

Guarded pages did `return null` when there was no user — a literally empty
screen — while a redirect effect raced to fire. If the session check failed
outright, that blank page was the whole experience, with no way out.

- New `SignedOut` component: says what happened and offers Log in / Home.
- `/play` and `/settings` render it instead of nothing.
- **The auto-redirect from `/play` is gone.** It raced the render and, when
  `/login` bounced back, produced the loop you hit. The signed-out screen is a
  destination, not a waypoint.
- `/login` now redirects away only when a session genuinely exists.

## Session errors are no longer silent

`fetchMe` treated every failure as "logged out". A 500 is not the same as a
401 — one means the server is broken, the other is normal. The store now keeps
`sessionError` for 5xx, and `SignedOut` shows it, so a server fault reads as a
server fault instead of a mysterious logout.

## Verified

21 migrations replay clean against real Postgres 16. `check:schema` passes. 209
shared tests, 245 web tests, every package typechecked except `apps/api`.

## To run

```powershell
docker compose --env-file .env -f deployment/docker-compose.yml down -v
.\bootstrap.ps1
docker compose --env-file .env -f deployment/docker-compose.yml exec api pnpm --filter @aurora/api db:seed-puzzles
```
