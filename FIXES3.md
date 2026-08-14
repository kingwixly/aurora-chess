# This round

## Mate showed as +1000.0

The eval bar handled mate correctly all along. The bug was upstream:
`useStockfish.evaluate()` collapsed `score mate N` into ±100000 centipawns and
returned no mate value, so every caller passed `mate={null}` and the bar
formatted 100000cp as "+1000.0". The information was destroyed at the engine
boundary, not in the display.

`evaluate()` now returns `mate` alongside `score`, and keeps a distance-scaled
centipawn stand-in (`100000 - mate * 100`) for callers that only plot a number —
so a mate in 1 still outranks a mate in 8 on the eval graph. A later `score cp`
line at higher depth clears a stale mate claim.

Wired through the bot game (`evalMate` state) and the analysis hook, which was
flattening it in three places.

Verified: `M3`, `M-3`, `+1.4` all format correctly; the old path produced
`+1000.0` from the same input.

## Per-time-control ratings are real now

`/auth/me` serializes the `UserRating` rows, plus title, mod shield and flair —
which it was not doing before, so the header rendered a bare username no matter
what titles someone held.

New `RatingPools` component on the dashboard shows Bullet / Blitz / Rapid /
Classical side by side. Unplayed pools show the 1200 start greyed rather than
being hidden: an absent pool reads as "this site does not have bullet", which is
worse than an honest "unplayed".

The write path was already correct — `updatePoolRating` runs before the title
recompute on every rated game, so queueing into blitz moves your blitz number.
What was missing was anyone ever seeing it.

## Still outstanding

Unchanged from STATUS.md, in the order I would take them:

1. **Settings page and the gear entry point.** The piece-set control is
   currently a CSS filter pretending to be a piece set — that needs either real
   assets or removal, and it is your call which. Board options (flip, themes)
   belong beside the board, account management on its own page.
2. **Puzzles.** Biggest new feature. PM is unearnable until it exists.
3. **Analysis board** with PGN upload and play-from-position.
4. **Profile page** — badge shelf and pool ratings are built but not wired in.
5. **Titles across the remaining six API routes** so they show in game lists.
6. Google sign-in.
