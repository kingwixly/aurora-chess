# Admin tools, username history, and what I added for players

## Your 1200 — found it

Not a Glicko problem. `RatingPools` had **1200 hardcoded as a display fallback**
from before the scale moved. The data was correct; the component was lying about
it. It now falls back to the shared `DEFAULT_RATING` constant, so this cannot
drift again.

## Peak ratings

On every pool card (`peak 1847 · 213 games`), on the leaderboard where peak
exceeds current, and on the FIDE panel.

Ratings whose deviation is still wide are marked **provisional** with a small
`?`. Presenting an unsettled number as established is how a player who has
played four games ends up believing they are 1900.

## Moderation panel

New **Moderation** tab in the admin app.

- **Issue bans** — account, IP or device; 24h / 7d / 30d / permanent. Permanent
  is deliberately last and not the default. The form warns that IP bans are
  blunt, because households and schools share an address.
- **Active bans** with one-click lift.
- **Cheat reports** sorted by score, with signals shown and four verdict
  buttons. The page states plainly that these are prompts to look, never
  verdicts.
- **Cheat exemption** toggle in the user panel, with a note explaining why
  titled players are exempt by default.

## Username history

New `UsernameHistory` table. Renames are recorded automatically, and:

**Searching an old name finds the person.** Someone renaming to escape a
reputation should not become unfindable, and an opponent looking up "the player
who beat me last week" should not hit a dead end. The result shows `was oldname`
so it is clear why they matched.

A name someone else previously held **cannot be taken**, so a rename cannot be
used to impersonate a former identity.

Visible in the admin user panel under a History tab.

## What I added for players

You asked what I would want if I played here. One thing above all:

**A leaderboard.** A club needs somewhere to see where you stand — it is the
thing that makes a rating feel like it is *for* something rather than a number
that moves. Five boards: bullet, blitz, rapid, classical, puzzles.

The design decision I care about: **unsettled ratings are excluded.** Glicko-2
knows how confident each rating is, and a 2400 with a wide deviation has played
four games rather than demonstrated 2400. Ranking on the raw number puts a lucky
newcomer above a proven player and makes the board worthless within a week. Ten
games and a settled deviation are required. Banned and deactivated accounts are
filtered out too — a public board should not be topped by someone who is not
allowed to play.

The honest cost: on a new site the boards will be empty for a while. The page
says so, and says how to qualify, rather than showing a misleading top ten.

## Verified

25 migrations replay clean against Postgres 16, with old-name search and cascade
delete checked on real rows. Schema check clean. 223 shared, 244 web, 11
anticheat tests. Every package and app typechecks.

## Next

Friends messaging, still outstanding.
