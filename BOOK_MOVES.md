# Book moves

## The bug you found

Live move feedback asked the wrong question:

```js
const opening = lookupOpeningClient(newSans);
if (opening) setFeedback("BOOK");
```

That is **"does this game have an opening name?"**, not "is this move still
theory". `identifyOpening` returns the deepest named position a game has passed
through, so once you are a couple of moves in it is truthy for the rest of the
game - and every move after that was labelled book, however bad.

Now `shouldLabelAsBook(fenBefore, move.san, ply)`, which asks about the move.

## The second problem, which you also caught

You pointed out that anything played in the first couple of moves has a name.
That is measurably true, and worse than I assumed:

| after   | share of legal moves that are "book"        |
| ------- | ------------------------------------------- |
| 0 plies | **100%** (all 20, including 1.a4 and 1.Na3) |
| 1 ply   | 30%                                         |
| 2 plies | 4%                                          |
| 3 plies | 1%                                          |
| 6 plies | 0%                                          |

So on White's first move the label applies to **everything**. It carries no
information, and because BOOK replaces the quality label it also suppresses the
only feedback that would have been useful.

`BOOK_MEANINGFUL_FROM_PLY = 2`. Before that, moves are classified normally. The
threshold is measured rather than picked - by the second ply it distinguishes
70% of moves, which is enough for the label to mean something.

`shouldLabelAsBook` is kept separate from `isBookMove` because they answer
different questions: one is "is this theory", the other is "does saying so
help".

## A latent bug found while looking

`isBookMove` called `chess.move()` without checking the result. chess.js throws
today so it never fired, but if it ever returned null instead, the position
would be unchanged and the function would report on the position **before** the
move - the same wrong question, in a much harder place to spot. Now checked.

## Polish pass

Swept for the bug classes that have actually bitten this project:

- `io.emit` broadcasts - none left
- hardcoded worker paths - none
- `useToast()` without a selector, which caused the moderation loop - none
- text colour outside a conditional - contrast check clean
- `mate={null}` hardcoded - only in tests, where it is correct
- unchecked `.move()` results - the remaining ones take generator output or are
  wrapped

Also removed **four more** `eslint-disable-next-line @next/next/no-img-element`
comments across web and ui. That rule is not configured here, so ESLint treats
the comment itself as an error - it is what blocked your commit hook last time,
and it would have blocked it again.

## Verified

359 shared, 342 API, 259 web tests. Six checks clean, and ESLint passes in all
five packages.
