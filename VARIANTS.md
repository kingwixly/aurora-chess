# Chess960

## The blocker worth knowing about

**chess.js gets Chess960 castling wrong**, and silently.

It applies the standard rule — move the king two squares toward the rook. In
Chess960 the king always finishes on g1/g8 or c1/c8 regardless of where it
started. With the king on b1, chess.js sends it to d1 for `O-O`; the correct
square is g1.

I checked this before writing any feature code, because building on top of it
would have produced games that looked fine and were illegal.

## What is built

`packages/chess/src/variants/chess960.ts` — the part that can be wrong, done
properly and tested exhaustively.

- **Position generation** using Scharnagl numbering, so a stored position id
  always replays the same game. 518 is the ordinary array.
- **Validity rules**: bishops on opposite colours, king between the rooks,
  correct piece counts.
- **Castling**, implemented directly rather than delegated: king to g/c file,
  rook to f/d, with checks for occupancy, castling rights, and the king passing
  through attack.

**20 tests**, including all 960 positions verified valid, all 960 distinct, and
all 960 accepted by the move generator.

Two of those tests caught my own wrong assumptions rather than bugs in the code:
I asserted every position opens with exactly 20 moves (a knight on the a-file
has one fewer, so it is 18–20), and I picked a "same-coloured bishops" example
that was actually legal.

## What is not built yet

The foundation is done; the wiring is not. Remaining:

- A `variant` column on Game, and `positionId` alongside it
- Game creation offering the variant, and the matchmaking pools kept separate —
  a 960 rating and a standard rating should not mix
- The move route calling `applyCastling` when the move is a castle, rather than
  passing it to chess.js
- The client board allowing the king-onto-own-rook gesture, which is how
  castling is expressed in 960
- Stockfish needs `UCI_Chess960 true` set, or the bots will suggest illegal
  castles

That is a session's work, not an afternoon, and it touches the move path — the
one place where a bug corrupts games rather than annoying someone.

## Fairy chess with amazons

Deferred, and honestly it should be.

An amazon moves as queen plus knight. No chess library supports it, so the move
generator, check detection, and mate detection would all have to be written from
scratch — and Stockfish cannot evaluate it at all, so there would be no bots, no
analysis, and no puzzles for that variant.

It is a genuinely interesting build, but it is a much larger one than Chess960
and it lands on a site with no players yet. Worth revisiting once there are
people asking for it.
