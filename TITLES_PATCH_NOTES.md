# Player Titles — patch notes

Adds staff-assigned titles, two unofficial auto-titles, and title bans to
AuroraChess. Branding default changed to AuroraChess.

## What was verified, and what wasn't

**Verified here:** `packages/chess` typechecks clean and its full suite passes
(155 tests, 19 of them new for titles). `packages/ui` typechecks clean. All
touched files pass the repo's Prettier config.

**Not verified here:** anything that imports `@prisma/client`. Generating the
Prisma client needs `binaries.prisma.sh`, which was unreachable from the machine
this was built on, so the API and admin app could not be typechecked. **Run this
first, before anything else:**

```bash
pnpm install
cd apps/api && npx prisma generate
cd ../.. && pnpm -r typecheck && pnpm test
```

Treat the API and frontend changes as needing a real read-through on first
build. The shared logic underneath them is tested.

## Model

Titles resolve through one function, `resolveTitle()` in
`packages/chess/src/player/titles.ts`:

```
titleBanned  ->  no title, full stop
titleManual  ->  masks titleAuto
titleAuto    ->  otherwise
```

Nothing is ever destroyed, only masked. Clearing a manual IM reveals whatever
auto title the player independently earned; lifting a title ban restores what
was underneath it. This is why there are separate columns rather than one.

Auto titles are **sticky and keyed off peak rating**, so a 2401 player who drops
a game keeps AM. `AM` at peak 2400, `UM` at peak 2200. Both are marked
unofficial in the UI and render in a different colour from federation titles.

`titleAutoLocked` exists because staff editing `titleAuto` by hand would
otherwise be clobbered by the player's next completed game. Setting `titleAuto`
through the admin API implies the lock; unlocking immediately recomputes from
peak rating rather than leaving a stale value.

## Schema

New on `User`: `peakRating`, `titleManual`, `titleAuto`, `titleAutoLocked`,
`titleBanned`, `titleBanReason`. New enums `ManualTitle` (GM/WGM/IM/WIM/FM/WFM/
CM/WCM/NM/WNM) and `AutoTitle` (AM/UM).

Migration `20260803120000_add_player_titles` adds the columns, seeds
`peakRating` from current rating, and backfills auto titles. Note the limitation
it documents: there is no rating history table, so for pre-existing accounts
current rating is the best available lower bound on true peak. Players who once
peaked higher are under-credited. Only affects accounts created before the
migration.

## Files

**New**

| File | Purpose |
| --- | --- |
| `packages/chess/src/player/titles.ts` | Types, thresholds, `computeAutoTitle`, `resolveTitle` |
| `packages/chess/src/player/titles.test.ts` | 19 tests |
| `packages/ui/src/TitleBadge.tsx` | `TitleBadge` + `PlayerName` |
| `apps/api/src/lib/titles.ts` | `PUBLIC_USER_SELECT`, `withTitle`, `updatePeakAndAutoTitle` |
| `apps/admin/src/components/TitleEditor.tsx` | Admin title modal |
| `apps/api/prisma/migrations/20260803120000_add_player_titles/` | Migration |
| `scripts/backfill-titles.ts` | Re-sync after restores or threshold changes |

**Modified** — `schema.prisma`, `gameSocket.ts` (recompute hook + player cards),
`routes/users.ts` (search, profile), `routes/admin.ts` (new endpoint, title
fields in the user list), `lib/schemas.ts` (zod), `apps/admin/.../users/page.tsx`,
`apps/web/.../profile/[username]/page.tsx`, both `index.ts` barrels, two
`package.json` files (added `@aurora/chess` to `ui` and `admin`),
`.env.example`.

## Admin API

`PATCH /api/v1/admin/users/:id/title` — all fields optional, `null` meaningful
and distinct from omission. Inherits the existing admin middleware, CSRF
protection and rate limiting. Writes a `user.title.update` audit entry with
before/after state.

```jsonc
{ "titleManual": "IM" }                          // assign
{ "titleManual": null }                          // clear, auto title resurfaces
{ "titleAuto": "AM" }                            // override + implicit lock
{ "titleAutoLocked": false }                     // release, recompute from peak
{ "titleBanned": true, "titleBanReason": "..." } // ban
```

## Still to wire

Titles are serialized on the endpoints that matter most: user search, public
profile, and live game player cards. The remaining render sites still return
users without a `title` field, and need `PUBLIC_USER_SELECT` + `withTitle()`
applied the same way `routes/users.ts` does it:

- `routes/activity.ts` — activity feed
- `routes/friends.ts` — friend list and requests
- `routes/games.ts`, `routes/publicGames.ts` — game lists
- `routes/collections.ts` — collection contents
- `routes/auth.ts` — `/me`, needed for your own title in the navbar
- `routes/invites.ts` — invited-by attribution

Each is mechanical. Worth doing them in one pass once the build is green, since
the pattern is identical and `PUBLIC_USER_SELECT` makes it hard to get wrong.

Frontend equivalents: `components/ActivityFeed.tsx`, the friends page, history
page, and the in-game player cards all render bare usernames and should use
`<PlayerName />`.

## Deploying

```bash
SITE_NAME=AuroraChess   # in .env
docker compose -f deployment/docker-compose.yml up -d --build
```

Migrations run automatically on startup via the `migrate` init container. To
verify the backfill without writing:

```bash
docker compose -f deployment/docker-compose.yml exec api \
  npx tsx scripts/backfill-titles.ts --dry-run
```

## Licence

`LICENSE` is untouched and still carries the upstream copyright, which is what
MIT requires you to retain. Add your own copyright line alongside it if you
want; don't remove theirs.
