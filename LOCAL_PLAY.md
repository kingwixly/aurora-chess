# Local play: two modes

| Mode                             | You have                | Screen shows           |
| -------------------------------- | ----------------------- | ---------------------- |
| **Play in person** (`/play/otb`) | two people, one device  | board, clock, controls |
| **Clock only** (`/play/clock`)   | a real board and pieces | just the clock         |

`/play/pass` redirects to `/play/otb`. It was a duplicate of the same mode
built without a clock, which made it strictly worse than the thing it copied.
The only actual bug in the original was that "no clock" set 999 minutes instead
of removing the timer.

## Play in person

The original mode, with the gaps filled rather than rebuilt:

- **No clock now means no clock.** `null`, not 999 minutes. The clock faces
  disappear, nothing counts down, nobody can flag.
- **Names before the game**, optional, used only to label the history entry.
- **Takebacks.** There is no rating to protect and the opponent is sitting
  right there to object.
- **Resign, draw offers and abandon**, with the draw offer shown to the player
  who has to answer it rather than the one who made it.
- **Saved to history** when it finishes.
- **Phone flat toggle**, off by default, which is what drives piece rotation.

## The board does not flip

The board stays fixed and the **pieces** rotate 180 degrees, and only when the
phone is lying flat between two players.

Flipping the board moves a1 to the opposite corner every move, so the position
appears to jump and neither player can hold a mental picture of it. On a real
board nobody rotates the table.

Held and handed across, nothing rotates - the person looking at it is always
the person to move.

## Clocks are readable upside down

Each clock face carries its colour in words and an underline beneath the
numerals.

Rotated 180 degrees, "9:00" and "0:06" are genuinely hard to tell apart, and a
player reading the wrong clock is worse off than one with no clock. Shaped
digits alone cannot fix that; a label and a baseline can.

## Clock only

The moving player's colour fills the whole screen. On a real chess clock the
running side is obvious from two metres; a small highlight on a phone is not.

White is a pale blue-grey rather than pure white - a full screen of #ffffff at
brightness is unpleasant to sit opposite.

Ending asks **how** it ended: checkmate, resignation, agreement, stalemate,
repetition, fifty-move, insufficient material. A loss on time and a loss to a
mating attack are different games, and a history that conflates them is worth
less.

## History

`/play/history`. localStorage, on the device, visible only to whoever holds the
phone. These games had no accounts behind them, so there is nowhere on the
server they could go and no rating they could affect.

PGN with the full seven tag roster, because other tools reject or mangle a file
without it. Copy to clipboard, or open in the analysis board.

8 tests on the PGN writer: quote escaping in names, odd move counts, date
format, empty games.

## Verified

355 shared, 340 API, 259 web tests. All five checks clean.
