# Engines, bots, navigation

## The Fairy bug, properly

`selectable: false` **was never in the object**. My edit added the comment
explaining it and the field itself did not land, so the code read "kept out of
every picker via `selectable: false`" while the picker cheerfully listed it.
My earlier grep matched the comment and I read that as the field existing.

The test now removes the field, fails, and passes again when restored. A
comment cannot fail a test.

## Bots that are not strength levels

**Pip and WorstFish were both rated 200**, and the server dispatched novelty
behaviour on rating. So playing Pip silently got you WorstFish's inverted
search from the second move onward.

Games now store a `botId`, and dispatch checks identity. This was a real bug
independent of Maia, and adding four Maia bots at ratings that collide with
existing ones would have made it much worse.

The events page links `/play/bot?bot=worstfish`, which was never read - the
page ignored the parameter entirely, so "Play WorstFish" dropped you on the
ordinary picker with no explanation. Now honoured.

## Maia

`maia3-js` plus `onnxruntime-web`. No Lc0, no compilation - it runs the Maia
weights directly through ONNX in the browser.

Four bots at 1100, 1400, 1700 and 1900.

This is a genuinely different thing from a weakened Stockfish. An engine capped
at 1200 plays like a strong engine told to err, and its mistakes are random.
Maia is trained on human games at a rating, so its mistakes are the ones people
actually make: missing a fork, walking into a pin, trading into a lost endgame.
That makes it far better practice.

Details worth keeping:

- **Loaded lazily.** The model is 21MB, which is reasonable when you have asked
  to play Maia and not otherwise. It is never in the main bundle.
- **The load promise is shared**, so two callers racing during the download get
  one load rather than two.
- **Predictions are filtered against the real move list.** A model predicts
  likelihoods, not legality, and an illegal move from it would end the game.
- **Falls back to the engine** if the model cannot load. A 21MB download over a
  poor connection should not cost you the game.

## Engine failures no longer break play

A worker that failed to load left the hook permanently not-ready, and every
caller treats not-ready as "cannot play". So one engine failing to download
broke bot games **for everyone**, including people who had never touched the
setting. That is why "some engines don't download but all of them break
matchmaking".

There is now one retry onto the bundled build, covering both the error event
and the silent ES-module failure where the worker constructs and never speaks.

## Renames and removals

- **Stockfish 18P** - single thread, explained in its own description
- **Stockfish 18** - the full build, no apology about size
- **Stockfish 16.7 deleted entirely**, files and all. I took the filename
  `sf16-7` from Lichess's package and invented a product version from it. The
  binary identifies only as "Stockfish" with no version, so nothing there could
  be labelled honestly.
- Stale piece-sets note removed

## Navigation

The old bar sat inside a centred `max-w-7xl`, so on a wide monitor the logo
floated in the middle with empty space either side and every link was crushed
together in the centre. There was also no overflow behaviour - as links were
added the bar simply got tighter.

Now: logo anchored left, account controls anchored right, links between them,
and anything that does not fit goes under **More** rather than squeezing what
is already there.

**Mobile gets a drawer, not a shrunken topbar.** A phone showing a compressed
copy of the desktop bar reads as an afterthought. The drawer closes on
navigation and on Escape, locks the page behind it, and pads for the notch.

## Not done

RustyChess and Weiss. Both need a `wasm32` toolchain I cannot obtain here -
`static.rust-lang.org` returns `403 host_not_allowed` and no apt package ships
the wasm32 standard library. Neither repo has a prebuilt artifact or a release.

I still need the **moderation and ticket network response** - status code and
body - rather than the console log, which only showed an ad-blocker and an
unrelated web-vitals error.
