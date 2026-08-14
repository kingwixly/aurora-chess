# Reports, chat, coaching, identity — and two live bugs found

## Two real bugs, caught by a test suite I had never run

`apps/api` has its own test suite. I had been treating the app as unverifiable
because it needs a generated Prisma client — but most of the suite mocks Prisma
and runs fine. Running it found this:

### Ratings did not change on resignation or timeout

Two result notations were in circulation. Resignations and timeouts emit
`WHITE_WIN`/`BLACK_WIN`; everything else emits `1-0`/`0-1`. `computeElo` only
understood PGN, so **every resignation and every timeout was scored as a draw** —
no rating movement for either player.

The per-pool win/loss counters had the identical bug, so those games were
recorded as draws in the Bullet/Blitz/Rapid/Classical statistics too.

Both now normalise, and a test asserts the two notations produce identical
results.

### Capability lookup could 500 the whole site

The new moderation hook queried punishments on every gated route. A failure
there returned 500 rather than degrading.

It now **fails open**, deliberately: failing closed would lock every legitimate
player out during a database blip in order to keep out the handful of people
under a restriction. Bans — the punishment that matters — are enforced
separately at sign-in, so the exposure is a suspended player getting one game
they should not have during an outage.

## Anti-cheat now has real inputs

`screenGame` reads accuracy from `GameAnalysis`, which the **worker** computes
with Stockfish server-side. Client-reported accuracy is never used: a screening
decision must not rest on a number the player's own browser supplied.

The baseline is the player's own last 30 analysed games. Comparing someone
against themselves is the only comparison that means anything — "90% accuracy"
describes very different play at 1200 and 2400.

Still forwards only. There is no code path from screening to a punishment.

## Reports

Profile, game page, and direct messages. Four categories, and a report needs a
sentence — a bare category cannot be acted on, and requiring one filters the
reflex reports filed after a loss.

Rate-limited to 10 a day per reporter, with one open report per target: repeated
filings about the same person do not make the queue move faster.

Admin review queue with outcomes, alongside the appeals queue.

## In-game chat

**Off by default**, remembered per player. Most in-game chat is tilt, and the
people it lands on are the ones who quietly stop playing — so it is something
you turn on, not something you turn off after it ruins a game.

Five messages per 30 seconds, 200 characters. The cap is about pressure rather
than bandwidth: a stream of messages while an opponent is on the clock is a way
of playing the person instead of the position.

Capabilities are re-checked inside the socket handler, because socket events do
not pass through Fastify's preHandler chain — a chat restriction would otherwise
be trivially bypassed.

## Coaching bands

Four vocabularies for the same classification. A blunder to a beginner is "check
whether any of your pieces can be taken for free"; to an expert it is
"Blunder." Cross-game pattern detection requires 4+ occurrences *and* 10%
frequency — four times in two hundred games is not a habit.

## Profile identity

- **Country flags** from ISO codes via regional-indicator characters, so no flag
  assets, no licensing question, no 250-file sprite sheet.
- **Bio**, 300 characters, links rejected — a public profile is a spam vector.
- **Flair picker mounted** in settings at last, choosing from earned badges,
  with server-side ownership checks.
- Staff mark and flag now render on profiles.

## Friends strip

Online friends on the dashboard with one-tap challenge. Renders nothing when
nobody is online — an empty strip saying "no friends online" is a small daily
reminder of it.

## Admin

Issue any punishment type, lift early, decide appeals with recorded reasoning,
review player reports. Accepting an appeal overturns the punishment and
recomputes titles immediately rather than waiting for a nightly job.

Three consecutive denials close appeals on that action automatically.

## Verified

| | |
|---|---|
| `packages/chess` | 259 tests |
| **`apps/api`** | **299 tests** |
| `apps/web` | 244 tests |
| Schema check | 29 models clean |
| Migrations | 27 replay clean against Postgres 16 |

Everything typechecks. The API suite is now part of every verification pass.

## Still outstanding

- Avatar upload (the URL field works; storage and moderation do not exist)
- Cross-game pattern detection wired to real game data — the logic and tests
  exist, the query does not
- Club pages, offline bot play, Google sign-in
