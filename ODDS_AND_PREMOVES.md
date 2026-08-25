# Premoves and odds

## Premoves never worked, and could not have

`movable.color` was set to `turnColor` — whose turn it is — rather than to the
player's colour.

Chessground decides whether a drag is a **move** or a **premove** by comparing
`movable.color` against `turnColor`. Setting them from the same value meant they
were always equal, so nothing was ever treated as a premove. And when it was the
opponent's turn the `movable` prop was false, so the colour was `undefined` and
the board did not know which pieces you were even allowed to pick up.

So premoves could not be _set_, let alone played. The `playPremove()` call added
later was correct and was firing against an empty premove slot.

Fixed with an explicit `playerColor` prop, defaulting to `orientation`, which is
right for any normal game. Analysis boards leave it undefined, since both sides
are movable there and neither is "yours".

## Odds

`packages/chess/src/variants/odds.ts`. Ten kinds: pawn, pawn and move, knight,
rook, queen, two or three free moves, double or triple time.

**Suggested at a 500-point gap**, ordered by how closely each matches the gap —
a 1000-point difference leads with queen odds, 500 leads with the knight.

Two rules the implementation enforces rather than documents:

**Nothing is ever applied without agreement.** The module suggests and
constructs; it never starts a game. A game that silently begins with your queen
missing is a bug report, not a feature.

**Odds games do not affect rating.** A rating describes even play; a handicap
result describes the handicap. Feeding one into the other corrupts the number
for both players — the same reasoning that keeps unsettled ratings off the
leaderboard.

One detail worth naming: removing a rook also strips the matching castling
right. A FEN claiming a right whose rook is gone is rejected outright by
chess.js, so without that the position would not load at all.

15 tests, including every material-odds position replayed through the move
generator, and an assertion that material comes off the **stronger** player —
taking it from the wrong side would double the mismatch instead of closing it.

## Verified

340 API, 294 shared, 251 web tests. Schema and route checks clean.

## Still outstanding

- **Challenge UI** — queue-after-current vs concurrent, 5 for untitled and
  unlimited for titled, bot games shown as real games rather than "vs ?"
- **Engine selection** — Lc0, Weiss, RubyChess, with a cancellable download
- **Events tab**
- **Odds UI** — the logic is done and tested; the offer-and-accept flow on the
  challenge screen is not built
