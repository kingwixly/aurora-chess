# Aurora Chess — frontend overhaul

## Design decisions, so you can overrule them

**Palette** sampled from your logo, not invented: `#0A0F1C` navy (the piece),
`#18C0D8` cyan and `#4830C0` violet (the ribbon), `#183078` indigo (the
wordmark). Cyan and violet are used as a **pair** — the aurora gradient is the
brand, not a single accent. That also keeps the two title tiers legible against
each other: federation titles amber, Aurora titles violet.

**Type.** Fraunces for display (an optical-size serif with a wonk axis — has
character at large sizes without reading as a stock editorial serif). Inter for
body. **JetBrains Mono for ratings, titles, clocks and notation** — not
decoration: chess notation is inherently monospaced, columns of ratings line up,
and a ticking clock doesn't jitter as digit widths change.

**Signature:** the aurora band. The logo's ribbon flattened to a 1px gradient
line, used as the page top rule and section divider, so the brand shows up as
structure rather than a logo pasted in a corner.

**Layout:** Lichess-shaped — quick-play tiles lead, right rail for identity and
activity. Not Chess.com's big-CTA-and-cards. If you wanted the other shape, the
grid in `play/page.tsx` is the only thing that changes.

## Built

**Homepage** (`app/page.tsx`) — did not exist before; the root was a logo and
two buttons. Leads with the thing that actually distinguishes Aurora: titles
earned on the board rather than through a federation. Signed-in visitors still
redirect straight to `/play`.

**Play dashboard** — the single-column button stack is gone. Two columns: eight
quick-play tiles grouped by rating pool (so a player chasing BM can see which
tiles feed it), then challenge/engine, then a section grid. Right rail carries
your rating, activity, and the install prompt. Header shows your identity with
title, shield and flair.

**Login and register** restyled to the system: proper field focus rings, errors
as a bordered block rather than loose red text, copy rewritten to say what
happens rather than to apologise.

**Identity components** (`packages/ui/src/Identity.tsx`) — `PlayerName` renders
shield, title, name, flair, rating in one consistent order, which is what makes
a title scannable in a game list. `TitleBadge` colours federation vs Aurora
titles differently and its tooltip carries the criteria. `BadgeShelf` renders
profile badges with pinned ones raised. `AuroraBand` is the signature.

**Email removed** from the client `User` type's rendering path, with a comment
explaining why — as you said, streamers.

**Admin rating editing** — `PATCH /admin/users/:id` now takes `rating` (bounded
400–3500) and `ratingReason`. Two things worth knowing about the design:
corrections move **peak** rating too, because leaving a stale higher peak would
preserve a title the corrected rating no longer supports; and the automatic
title is recomputed immediately after, so a correction downward strips a title
the player can no longer justify.

## Verified

`packages/chess` 185 tests passing. `packages/ui` typechecks clean. Everything
formatted.

**Not verified:** `apps/web` and `apps/api` were not typechecked — that needs a
generated Prisma client this sandbox cannot produce. **Run
`pnpm -r typecheck` after `prisma generate` before anything else.** Expect
errors; the ones I'd bet on are the `user.title` / `user.modShield` /
`user.activeFlair` fields on the play page, which need the API's `/me` endpoint
to actually serialize them.

## Still to do

- **`/me` must serialize title, shield and flair.** `PUBLIC_USER_SELECT` and
  `withTitle` exist in `apps/api/src/lib/titles.ts`; `routes/auth.ts` doesn't
  use them yet. Until it does, the header renders a bare username.
- **Profile page** — `BadgeShelf` is built but not wired in, and the badge
  pinning UI doesn't exist.
- **Admin UI for rating** — the endpoint is live, the input field isn't.
- **Titles in game views** — `PlayerName` is ready; the game page still renders
  raw usernames.
- **The remaining routes** listed in the earlier notes still need
  `PUBLIC_USER_SELECT` applied: activity, friends, games, publicGames,
  collections, invites.
- **The small-size logo mark** is still unreadable below 48px.
- **Rematch button** — still couldn't reproduce from code alone. What's the URL
  when it fails?
