# Status

## Fixed this round

**Bot portraits.** `avatar` is a file path now, and two places were still
printing it as a string — hence `/bots/pip.png Pip (200)` in your screenshot.
Both now render `BotAvatar`.

**Random bot.** `rollRandom` set `selectedBot`, but if the Custom Elo toggle was
on the UI ignores `selectedBot` entirely, so the roll silently did nothing. It
now clears that toggle first.

**Local game-over screen** rebuilt to match the online one: display face,
"You won"/"You lost", coloured result band, and the bot's portrait with their
parting line underneath — which is where the dialogue system finally pays off.
Buttons say what they do ("Play Pip again", "Choose a different opponent")
rather than Rematch/New Game/Analyze/PGN in a row.

**Time controls now ask.** Tapping a tile opens a panel: random opponent or
challenge a friend. Live waiting counts poll every 5s and appear on the tile
*only when someone is actually waiting* — a row of zeroes reads as "nobody plays
here".

## Not done, and why

**Piece sets genuinely don't work — you were right.** They are CSS filters
(`saturate`, `grayscale`) applied to the same pieces. Real piece sets need
actual SVG assets, and the good open sets (cburnett, merida) are GPL, which
would change the licensing position of the whole repo. Options: commission or
generate a set, use a permissively-licensed one, or cut the feature and keep
board themes. **Your call — I'm not going to keep shipping a control that
pretends.** Same reason the mini boards still use Unicode glyphs: no piece
assets exist to draw with.

**Per-time-control Elo is stored but not yet displayed or used as the headline
rating.** `UserRating` is populated on every rated game, but profiles, the
header and the game-over screen still show the pooled `User.rating`. Wiring that
through means touching the serializers on six routes plus four UI surfaces.

**Not started:** puzzles, the analysis board with PGN upload, the dedicated
settings page and gear entry point, board-side options panel, Google sign-in.

## Priority question

That remaining list is roughly three more sessions. My read on the order:

1. Per-time-control Elo displayed properly — it is the thing you asked for
   twice and it is half-built, which is the worst state for anything to be in.
2. Settings page and the gear — the piece-set control is currently lying to
   people and settings has no home.
3. Puzzles — biggest new feature, and PM is unearnable without it.
4. Analysis board with upload.

Tell me if you'd reorder that.
