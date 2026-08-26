# Local play: two modes

## Two different things, kept separate

**Play in person** (`/play/otb`) - you have a real board and pieces. The phone
is the clock and the scoresheet. This is the one you said to keep.

**Pass and play** (`/play/pass`) - no physical board. Two people share the
phone, either handing it across or laying it flat between them.

Both are linked from the bottom of the play page, below a divider.

## The board does not flip

On pass and play, the board stays put and the **pieces** rotate 180 degrees on
black's turn.

Flipping the whole board makes the position appear to jump - squares you were
just looking at move somewhere else, which is disorienting when you are also
trying to see what your opponent played. Rotating only the pieces keeps every
square exactly where it was and still presents them upright to whoever is
sitting opposite.

Implemented as a CSS rule on the `<piece>` elements rather than a board option,
so it composes with Chessground's own positioning transform instead of fighting
it. Coordinates and the last-move highlight belong to the board, not the pieces,
so they deliberately stay put.

There is a **"phone flat on table"** toggle, off by default, because most people
hand the device across rather than lay it down - and rotation only helps in the
second case.

## Resign, draw, abandon

Shared by both modes via `LocalGameControls`.

A draw offer here is not a network message, it is a prompt handed physically
across the table - so the offer appears to the player who has to **answer** it,
not the one who made it. Accept and decline are on that same screen.

Every destructive action asks twice. On a shared phone a mis-tap ends somebody
else's game, and a confirmation is cheap next to that.

Takebacks are allowed in pass and play. There is no rating to protect and the
opponent is sitting right there to object.

When the phone is flat, the black-side controls are rendered rotated too, so
the player opposite can reach their own resign button without turning the
device round.

## Not rated, not recorded

Neither mode touches a rating or writes to a profile. These are games between
two people in a room; recording them would make people hesitate to use the
feature, and the rating would be meaningless anyway since one person controls
both sides of the device.

## Verified

355 shared, 340 API, 251 web tests. Schema, routes and contrast clean.
