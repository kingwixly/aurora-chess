# Installed app, play in person, alts, engines

## Engines: what I could and could not do

**The bundled build is already Stockfish 18** - 7MB, in `/public/stockfish`. My
catalogue had it labelled as 17, which was simply wrong.

I could not bundle the others. GitHub's API rate-limited the sandbox, and more
importantly, adding 50-100MB of WASM to a repo you robocopy between machines
every session is a bad trade for engines nobody has asked to use yet.

So the catalogue is now **honest instead of aspirational**. Each engine carries
an `available` flag; unbundled ones are listed with their status rather than
hidden, and `resolveEngine` refuses them outright rather than silently falling
back. Picking Weiss and quietly getting Stockfish is worse than being told
Weiss is not ready.

To add one later: drop the worker and wasm into `/public/engines`, set
`available: true`. Nothing else changes.

## Play in person

`/play/otb`. Real board, one device as the clock and scoresheet.

Linked from the bottom of the play page, below a divider - findable when you
want it, not competing with the buttons people actually came for.

Design decisions worth stating:

- **Nothing is rated or saved.** This is a cafe game. Recording it to a profile
  would make people hesitate to use it.
- **The board flips to whoever is on move**, so each player reads their own
  position without picking the phone up and turning it round.
- **The clock is driven by wall time**, not by counting intervals. A phone that
  sleeps or throttles timers would otherwise gift time to whoever was on move.
- Below ten seconds it shows tenths, because that is when people watch it.
- Works offline once loaded, which matters - the places people play over the
  board are often the places with no signal.

## Installed-app experience

`useStandalone()` detects launch from the home screen, on iOS (which uses a
non-standard property) and everywhere else (display-mode media query).

When installed, a **bottom tab bar** appears: Play, Puzzles, Search, You. It is
deliberately absent in a browser tab, where it would compete with the browser's
own navigation. Installed there is no back button and no address bar, and
without something like this the app is a dead end - the most common way an
installed web app feels broken.

It hides itself on game and board screens, where a tab bar costs a rank of
squares, and pads for the iOS home indicator via `safe-area-inset-bottom`.

## Authorised alts

Staff-granted, titled players, capped at 3.

Four gates, each for its own reason: staff must grant it (self-service alts are
ban evasion with extra steps), the account must be titled (the population this
is for, and externally verifiable), a cap (a second identity and an account
farm differ by degree), and an alt cannot spawn alts (or the tree stops being
reasonable about).

**Punishments apply across the whole family**, in every direction - owner to
alt, alt to owner, alt to sibling. Punishing one name while the others keep
playing would turn an authorised alt into precisely the evasion tool the
authorisation exists to prevent. There are tests for all four directions.

What IS per-account: title display, FIDE panel, country, flair, bio, avatar.
An alt is a different name, not a fresh start.

13 tests.

## Verified

355 shared, 340 API, 251 web. Schema, routes, contrast clean.

## Still not built

- Alt creation UI and the account switcher (logic and schema are done)
- Bot CRUD, image uploads, draw offers, daily games
- Text-glyph piece theme, grid options, full light-theme inversion
- Support ticket UI - see SUPPORT_TESTING.md for driving it with curl
- Google sign-in
