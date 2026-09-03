# Chess variants

## Fairy-Stockfish is not a choice

Corrected from the previous version, which listed it in the engine picker.

It is now `selectable: false` - catalogued so the loader can find it, hidden
from every picker. `engineForVariant(variant, preferred)` returns it
automatically for any variant game and the player's own preference otherwise.

The reasoning: asking someone to pick an engine that only matters for Atomic,
and which is chosen for them the moment they start an Atomic game, is a
question with no useful answer. Offering the choice and then overriding it
would be worse than not offering it.

Chess960 deliberately does **not** trigger Fairy. It is a shuffled start, not a
rule change, and plain Stockfish plays it with `UCI_Chess960`.

## Six new variants

| Variant              | Rule                                                                  | Wins by                           |
| -------------------- | --------------------------------------------------------------------- | --------------------------------- |
| **Atomic**           | Captures explode, destroying both pieces and every non-pawn neighbour | Blowing up the enemy king         |
| **Crazyhouse**       | Captured pieces become yours and can be dropped                       | Checkmate                         |
| **King of the Hill** | The four central squares are the hill                                 | Walking your king into the centre |
| **Three-check**      | Checks are counted                                                    | Three checks                      |
| **Antichess**        | Capturing is compulsory, no check, king is ordinary                   | Losing everything                 |
| **Horde**            | Black has an army, White has thirty-six pawns and no king             | Taking every pawn                 |

Each is ordinary chess with one rule changed, which is why they layer over a
standard move generator rather than needing their own.

## The problem chess.js caused

**chess.js refuses to construct a position missing either king.** Reasonable
for standard chess, fatal here: Atomic ends by exploding a king, Horde gives
White no king at all, and in Antichess kings are ordinary capturable pieces.

Every result function therefore parses the FEN board field directly rather than
loading a position. This surfaced as four failing tests before it surfaced as a
bug, which is the right order.

## Details worth keeping

**Pawns survive the Atomic blast.** Only the captured pawn itself dies. Without
that, pawn structure evaporates and the game collapses in a handful of moves.

**A move that blows up your own king is illegal**, even when it destroys
theirs at the same time. The mover loses in that case, so it is never a winning
move - it is simply not a move.

**Capturing is compulsory in Antichess.** This is the entire game; without it
you have chess played badly.

**A promoted piece reverts to a pawn when captured** in Crazyhouse. Reading the
type off the board would hand out free queens.

**`UCI_Variant` is set before the first move**, not on the first capture. An
engine told to play Atomic generates different moves from ply one, and one
that was not told plays ordinary chess on a variant board - which looks like
the engine making illegal moves.

**The opening book is skipped for every variant.** Theory belongs to standard
chess; a shuffled rank or an altered rule set makes it meaningless at best.

## Where the boundary sits

These rules exist so the client can validate moves and detect endings without a
round trip. **Fairy-Stockfish remains authoritative.** Two places where the
client is an approximation, and says so in the code:

- Antichess positions where a king is pinned, since chess.js will not generate
  moves that leave a king attacked and Antichess has no such restriction
- Crazyhouse drops, which chess.js has no concept of at all

24 tests on the rules.

## Verified

388 shared, 342 API, 259 web tests. All six checks clean.
