# This build

## Done

**Premoves.** Chessground stored them but nothing ever *played* them — a premove
was drawn, survived the opponent's move, then silently did nothing. `playPremove()`
now fires after the position updates, on a deferred tick so the new position is
committed first. Enabled in live games and bot games.

**The analysis board crash.** `Cannot read properties of undefined (reading 'key')`
was mine: I passed a hex colour where Chessground expects a **named brush**
(`green`, `blue`, `paleBlue`...). An unknown name resolves to `undefined` and
crashes inside the shape renderer — which also left dragging in the broken state
you saw. Brush names are now validated with a fallback.

**Analysis engine panel**, modelled on your reference: three lines with score
chips and SAN, depth readout, opening name and ECO code, and a move-feedback
toggle. Replaces the cyan arrow you correctly noted did not exist.

**Piece sets.** Rims removed entirely. Fae and Vista re-cropped with connected-
component filtering, which strips the fragments of neighbouring pieces that the
gap-based crop left behind — that was the "improper cropping". **Sleek dropped**;
you were right that it is Vista with transparency. **Minimalistic renamed Fatty.**

**Homescreen boards.** They rendered every piece white because Unicode outline
and filled chess glyphs are separate characters and the text colour overrode
both. They now use the real piece images.

**Puzzles.** The card still said "Coming soon" — an earlier edit missed after a
class rename. `/puzzles` hung on "Finding a puzzle..." forever because a failed
load fell into a state with no UI; it now says what went wrong and offers a
retry. **If it says no puzzles are loaded, run the seed** — that is the likely
cause.

**Staff ranks.** New `staffRank` field, rendering the Aurora mark after the FIDE
badge and before the name. Independent of `role`, so someone can be recognised
publicly without holding admin rights.

**Founder badge.** New accounts numbered 50 or below get it automatically at
signup; existing accounts were backfilled by signup date. Verified against 60
seeded accounts — exactly 50 received it. Staff can grant and revoke it.

**FIDE Verified badge** now carries FIDE's own mark rather than a green tick
emoji. The badge shelf renders any icon starting with `/` as an image.

**Recent games privacy.** Toggle in settings. Hidden games are omitted from the
response entirely rather than sent and hidden in the UI — anything that reaches
the client is public whatever the component does with it. Your own profile
always shows them.

**Account management.** Username, avatar, email and password. Email changes
require the current password, since that address receives password resets.
Changing a password revokes every session including the current one.

**Player search** on the dashboard, debounced, linking to profiles.

## Verified

Schema check clean, 223 shared tests, 244 web tests, every package and app
typechecks except `apps/api`. 23 migrations replay clean against Postgres 16,
with the Founder backfill checked on seeded data.

## Not done — and why

**The bot rematch 502.** Your console shows 502 on `/auth/refresh` *and*
`/games/bot` — a 502 is nginx failing to reach the API at all, not a bug in the
rematch handler. Most likely the API container was restarting. Reproduce it once
the stack is stable and send me the **API** log rather than the browser console;
if it is still failing then it is a real handler bug and I will fix it properly.

**Friends tab rework** (messaging, friend list, filter-vs-search split). Messaging
is a whole subsystem — schema, sockets, unread state, moderation — and bolting a
half version onto this build would have been worse than leaving it.

**The verify/unverify button purpose.** I did not want to guess: it currently
sets `verified` on the user, which gates nothing. Tell me what it should gate —
email confirmation, or posting rights, or something else — and it is quick.

**Google sign-in.** Still needs OAuth credentials.
