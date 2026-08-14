# Aurora Chess — stage 1

Fork of EyeOnChess, fully rebranded, with the ratings and titles foundation
rebuilt. This is **not yet runnable end to end** — see "What's next".

## Verified here

- `packages/chess`: 174 tests passing, typecheck clean
- `bootstrap.sh`: shell syntax validated, env-rewriting logic tested against
  the real `.env.example`
- Rename: 173 files rewritten, zero `eyeonchess` strings outside `LICENSE`

## Not verified here

Anything importing `@prisma/client`. The sandbox can't reach
`binaries.prisma.sh`, so the API and admin app were not typechecked and the new
migration has not been applied. **`bootstrap.ps1` runs `prisma generate` first**
— that is where any schema error will surface.

## Changed

### Branding
`@eyeonchess/*` → `@aurora/*` across all packages. Logo wired into
`apps/web/public` (favicon set, PWA icons, maskable variant, OG card).
`LICENSE` retains the upstream copyright as MIT requires, with Aurora's added
above it.

### Ratings
New `UserRating` model keyed `(userId, timeControl)`, with per-pool rating,
peak, and W/L/D. `User.rating` is kept as the pooled overall figure so existing
leaderboards keep working. This is what makes the specialist titles possible.

### Titles
Seven automatic, three unofficial manual, ten federation. Precedence is
declaration order in `AUTO_TITLE_RULES` — overall strength outranks specialist,
which outranks activity.

| | Title | Criteria |
|---|---|---|
| AM | Aurora Master | 2400 overall |
| UM | Undermaster | 2200 overall |
| VM | Velocity Master | 2200 bullet or blitz |
| SM | Siege Master | 2200 classical |
| PM | Puzzle Master | 2300 puzzle over 200 solved |
| EM | Endgame Master | 65% of 50+ decided endgames |
| TM | Tempered Master | 3+ tournament wins |
| HM / RM / OM | Honorary / Resident / Opening Master | staff-granted |

PM and EM carry sample floors deliberately — puzzle rating and endgame win rate
are both noisy over small samples, and a title that can be farmed in ten games
isn't worth displaying.

### Flairs
Separate system: `UserFlair` rows record what a user has *earned*,
`User.activeFlair` records what they *display*. `resolveFlair` refuses to render
a flair not in the earned list, since the active field is user-settable. Keys
are strings rather than an enum so new flairs don't need a migration. Founder is
automatic for the first 50 accounts.

### Mod shield
`User.modShield`, independent of `role` — staff can be publicly marked without
holding admin access, and vice versa. Renders before the title, so a moderator
with an IM shows both.

### Fixes carried over from the EyeOnChess debugging
- `docker-compose.yml` now passes `NEXT_PUBLIC_*` as **build args**. Next bakes
  these into the bundle at build time; `env_file` only affects runtime, so
  without this the frontend always called `http://localhost` no matter what
  `.env` said.
- `apps/admin/Dockerfile` now copies `packages/chess`, which the title helpers
  need.
- `.gitattributes` forces LF on shell scripts. CRLF on `nginx-entrypoint.sh`
  makes nginx crash-loop with `set: illegal option`.

### Bootstrap
`bootstrap.ps1` (Windows) and `bootstrap.sh` (Linux) check prerequisites,
generate `.env` with real random secrets, build, start, and verify. They encode
the three things that cost hours to discover:

- Default host is `aurora.local`, not `localhost` — the auth cookie is scoped to
  the registrable domain so the admin subdomain can share it, and a single-label
  host has no registrable domain.
- `NODE_ENV=development` locally — under `production` the auth cookie is marked
  `Secure`, and browsers silently drop `Secure` cookies over plain HTTP. Login
  returns 200 and never persists.
- nginx is restarted after every build — it resolves upstreams once at startup
  and caches container IPs, so a rebuild leaves it proxying into the void.

`./bootstrap.sh --domain yourdomain.com` sets production values and leaves
`SITE_DOMAIN` empty, which is correct behind Cloudflare Tunnel.

## What's next

**Stage 2 — frontend.** Homepage, account pages, user search, challenge system,
navigation, design system built on the logo palette (`#18C0D8` cyan, `#4830C0`
violet, `#0A0F1C` navy). Title badges and flairs rendered everywhere a username
appears. A simplified small-size logo mark — the current one turns to mush below
48px.

**Stage 3 — features.** Puzzles, tournaments, Stockfish verification.

## Running it

```powershell
.\bootstrap.ps1
```

```sh
./bootstrap.sh
```
