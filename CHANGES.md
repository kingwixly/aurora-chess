# This batch

Everything since the CORS fix, in one push: email, bots, premoves, odds,
challenges, engines, events.

## Bugs found

**Premoves could never have worked, anywhere.** `movable.color` was set to
`turnColor`. Chessground decides move-vs-premove by comparing those two, so
they were always equal and nothing was ever a premove. When it was the
opponent's turn the `movable` prop was false, making the colour `undefined`, so
the board did not even know which pieces you could pick up. Fixed with an
explicit `playerColor`.

**Strong bots played the Scandinavian** because `preferredOpenings` was stored,
validated, and never read by the engine. Now consulted for the first eight
plies. A second bug surfaced while testing: black lines were stored as bare
replies, so index 0 of a line did not match ply 0 of the game and **no black
line could ever have matched** even after the book was wired up.

**Challenge notifications were broadcast to the entire site.** `io.emit` sends
to every connected client, so everyone saw every challenge, including the game
id. There was no per-user room at all. Added one; challenges, accepts and
declines are now directed.

**Registration could crash the API.** `sendVerificationEmail` was called with
`void` so mail would not delay signup, which means a rejection was unhandled —
and Node can exit on those. A database hiccup while issuing the token would
have taken the process down mid-signup.

**The mail transport was cached before the token was checked**, so clearing
`CLOUDFLARE_EMAIL_TOKEN` left mail live until a restart. Bad property to find
during an incident.

## Added

**Odds** — ten kinds, suggested at a 500-point gap, ordered by how well each
matches. Never applied without agreement, and never rated: a rating describes
even play, and a handicap result describes the handicap.

**Concurrency** — five real-time games for an ordinary account, unlimited for
titled players and for correspondence. Enforced server-side, not just in the
UI. Someone mid-game gets offered "queue after this one" rather than a flat
refusal, because declining loses the game entirely and people rarely
re-challenge.

**Engine selection** — Stockfish 17 and Lite, Maia, Weiss, WorstFish, each with
its download size stated. Maia and WorstFish are excluded from analysis
deliberately: Maia predicts the likely _human_ move rather than the best one, so
offering it as an analyst would give confidently wrong evaluations.

**Events page** with WorstFish, the bot ladder, and puzzle streak. Only lists
things that actually work.

**Bot dialogue** — 2 lines per event to roughly 8, 2,659 across 31 bots, with
each bot's own voice kept first.

## Verified

340 API, 317 shared, 251 web tests. Schema and route checks clean. Everything
typechecks.

## Still not built

- The **odds offer-and-accept UI** on the challenge screen. The logic is done
  and tested; the flow is not.
- **Queued challenges** need a `queuedAfterGameId` column to survive a restart.
  The rules are implemented and tested; persistence is not.
- Engine workers are catalogued but the **worker files themselves are not
  bundled** — only `stockfish-17-lite` exists today, so the others will fall
  back until their builds are added to `/public/engines`.
