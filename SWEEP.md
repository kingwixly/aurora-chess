# Pre-release sweep

You were right to ask. Four more problems, one of which broke a feature
silently.

## Server-side analysis was broken

The route is `POST /games/:id/analyze`. The client posts to
`/games/:id/analysis`. My British-spelling sweep renamed the client call and
left the route alone, so clicking "analyse" on a finished game 404'd from that
moment on.

Nothing caught it: both sides compiled, both sides had tests, and the failure
only appeared as a 404 when somebody pressed the button.

Registered under both paths now, with a test asserting both stay reachable.

## The terms gate could trap a banned user

`TOS_EXEMPT_PATHS` still listed the deleted `board-test` page and did **not**
list `/standing`. If the terms ever changed, a banned user would have been shown
an acceptance gate they could not get past, on the one page they need in order
to appeal. `/standing` and `/fair-play` are exempt now.

## Production would have failed to boot

`CORS_ORIGIN` and `COOKIE_SECURE` are required by the new environment
validation and were absent from `.env.example` — so the bootstrapper, which
copies that file, would have produced a config its own API refuses to start
with. Both documented, along with `ADMIN_URL`, `LOG_LEVEL` and
`STOCKFISH_PATH`. Every variable the API reads is now in the example file, and
the generated 48-character secret comfortably clears the 32-character minimum.

## A checker that lied

My first client/server route check reported "all match" **on the exact bug it
was written to catch** — its fallback collected every quoted path in a routes
file, so the GET route supplied the path the missing POST needed.

A check that reports success while missing the thing it exists for is worse than
no check, because it stops anyone looking. Rewritten to walk each
`instance.verb(` call and take only the first path after it, then verified by
deleting the analysis route and confirming it fails.

## New permanent checks

`pnpm check` runs both:

- **`check:schema`** — every Prisma select matches the schema. Written after a
  dropped column took down `/auth/me`.
- **`check:routes`** — every client API call has a matching server route.
  Written after the analysis bug above.

## Also verified this pass

- Every Dockerfile `CMD` parses as JSON and as shell, with no literal
  backslashes — the bug found in the seeding fix
- Every script a Dockerfile references exists in the right package
- All 18 route modules are exported and registered
- All 190 relative imports across web and admin resolve
- Every seed script references only models that exist
- 27 migrations apply clean to an empty database

## Result

| | |
|---|---|
| `packages/chess` | 259 tests |
| `apps/api` | 307 tests |
| `apps/web` | 244 tests |
| Schema check | 29 models |
| Route check | 108 routes |
| Typecheck | five apps and packages |
| Migrations | 27 clean |

## Is it ready

Yes, for a small launch. The moderation path — ban, sign in, appeal, overturn —
is the one I would walk through by hand before inviting anyone, because it is
the only flow where a bug leaves someone with no way to help themselves.
`DEPLOY_CHECKLIST.md` has it as a numbered test.

Known gaps, none blocking: avatar upload, cross-game pattern detection, Google
sign-in, club pages.
