# Release preparation

## Bugs found and fixed

**Banned users could not sign in, which broke the entire appeal system.** Login
returned 403 on an active ban, so a banned player could never reach `/standing`
to contest it — every ban was permanent in practice regardless of what the
punishment said. Login now succeeds and returns a `banned` flag; the client
routes them straight to their standing page, and capabilities block everything
else.

**The puzzle attempt endpoint crashed on every submission.** A half-applied
Glicko-2 edit left the old Elo call beside references to a variable that no
longer existed.

**The matchmaking queue bypassed moderation entirely.** Socket events do not
pass through Fastify's preHandler chain, so a suspended player could still queue
for public games.

**Game routes were gated wrongly.** A blanket `playPublic` hook blocked *friend*
games under a mere restriction and *bot* games under anything at all. Now gated
per route.

**Strikes never materialised.** `becameStrikeAt` was never written, so the
twelve-month window measured from nothing and an expired punishment would have
counted forever. An hourly job converts them and restores titles whose block has
lapsed.

**`withTitle` was used but never imported** in the game socket — the first chat
message would have thrown.

**Chat history never loaded.** A refresh mid-game emptied the conversation,
which reads as messages having been lost.

**Spectators were shown a chat box** the server would reject every message from,
and a report button for an opponent they do not have.

## Release hardening

**Boot-time configuration validation.** The API refuses to start on a missing or
placeholder secret, an insecure cookie in production, or an unset CORS origin.
It reports every problem at once rather than one per restart. 7 tests.

**Mobile navigation.** The nav was `hidden md:flex`, so a phone had no way to
reach puzzles, the leaderboard, messages or anything else — every page existed
and none were findable. Chess is played on phones more than anywhere.

**Error, 404 and global-error pages.** A crash previously rendered Next's
unstyled default, which looks like the site is broken rather than one page, and
offered no way back. The global boundary is styled inline, since a layout crash
may mean the stylesheet never loaded.

**`board-test` removed** from the app entirely.

**Fair play linked publicly** from the homepage footer and indexed. How
moderation works is the thing prospective players most want to know, and the
thing the big sites are least willing to say.

**robots.txt and sitemap corrected.** Everything behind a login is excluded — a
punishment record has no business in a search index.

## Verified

| | |
|---|---|
| `packages/chess` | 259 tests |
| `apps/api` | 306 tests |
| `apps/web` | 244 tests |
| Schema check | 29 models clean |
| Migrations | 27 replay clean against Postgres 16 |
| Typecheck | all five apps and packages |

`DEPLOY_CHECKLIST.md` has the deployment sequence and a smoke test, including a
moderation test worth running before real users arrive — the failure mode there
is someone unable to contest a ban.

## Known gaps

- **Avatar upload** — the URL field works; file storage does not exist
- **Cross-game pattern detection** — logic and tests exist, the query does not
- **Google sign-in** — needs OAuth credentials
- **Club pages, offline bot play** — future work
