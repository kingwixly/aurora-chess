# Aurora Chess - stage 2: finalised titles + badges

## Verified against a real Postgres 16

Every migration replayed from empty and against a database seeded with existing
users. Results:

| user | peak | manual | auto (after) | why |
|---|---|---|---|---|
| dani | 2500 | IM | UM | 2400+ overall; IM masks UM in display |
| strong | 2300 | - | AM | 2200+ overall; was UM under old thresholds |
| speedy | 2250 | - | AM | recomputed from the new bar |
| natl | 2150 | *(cleared)* | - | NM dropped: national, not FIDE |
| new | 1200 | - | - | earns nothing |

Also confirmed: `AutoTitle` = `UM,AM,BM,HrM,PM,EM,TM`; `ManualTitle` =
`GM,WGM,IM,WIM,FM,WFM,CM,WCM,HM,RM,OM`; `UserRating` seeded with 5 pools per
user; `UserBadge` accepts pins and evidence; cascade delete removes a user's
badges and ratings.

`packages/chess`: 185 tests passing, typecheck clean.

**Not verified:** anything importing `@prisma/client` — the sandbox still can't
reach `binaries.prisma.sh`.

## Titles

**FIDE — WCM and above, verified holders only.** GM, WGM, IM, WIM, FM, WFM, CM,
WCM. NM/WNM were removed: they are national federation titles, not FIDE ones,
and your spec said WCM and above. The migration clears them from any existing
account. Say if you want them back.

**Staff-granted.** HM Honorary Master, RM Resident Master, OM Opening Master.

**Automatic**, in precedence order — first match wins:

| | Title | Criteria |
|---|---|---|
| UM | Undermaster | 2400 overall |
| AM | Aurora Master | 2200 overall |
| BM | Bullet/Blitz Master | 2200 bullet or blitz |
| HrM | Heritage Master | 2200 classical |
| PM | Puzzle Master | top 5% of solvers |
| EM | Endgame Master | sub-7-piece ending win rate |
| TM | Tournament Master | 3+ major tournament wins |

Heritage Master is **HrM**, not HM — HM is Honorary Master. One-line change if
you want a different abbreviation.

**PM is a percentile, not a bar.** The cutoff is stored in the new `SiteStat`
table and recomputed over the whole population on a schedule, rather than
hardcoded. It seeds to `0`, which *disables* PM rather than granting it to
everyone — on a site with nine solvers a 95th percentile is noise. Raise it once
the population justifies one.

## Badges

Separate system, profile-only. A user holds many, pins up to 3, and badges never
appear beside a username in game lists, chat, or search — you look them up
rather than having them follow a player around. That separation is what lets
FIDE Arbiter exist without pretending to be a playing-strength title.

**Credentials** (staff-verified, evidence required): FIDE Certified Arbiter,
FIDE International Arbiter, FIDE Trainer, FIDE Verified, Club Official.
**Achievements** (automatic): Tournament Winner, Streak Keeper, Marathon, Giant
Slayer, Centurion.
**Community**: Founder (first 50 accounts, automatic), Contributor, Author,
Patron.

`User.fideId` records the ID behind a verification. `UserBadge.evidence` holds
the staff-visible reference.

Badge keys are strings, not an enum, so adding one needs no migration. Retiring
one makes it vanish from profiles rather than leaving a hole — `resolveBadges`
drops unknown keys. Pins beyond the cap are demoted rather than rejected, so
lowering `MAX_PINNED_BADGES` later cannot strand anyone.

## What's still ahead

**Frontend.** The UI is still EyeOnChess's, renamed. Homepage, account pages,
search, challenge system, navigation, and the design system on the logo palette
(`#18C0D8` cyan, `#4830C0` violet, `#0A0F1C` navy). Badge display and pinning UI.
A simplified small-size logo mark — the current one is unreadable below 48px.

**Features.** Puzzles, tournaments, Stockfish verification. Note that PM and TM
cannot actually be earned until puzzles and tournaments exist; the title logic
is in place and waiting on the data.

**API wiring.** The recompute hook still reads only `peakRating`. It needs to
read the new pools and the `SiteStat` cutoff before BM, HrM, PM, EM and TM can
be awarded during play.
