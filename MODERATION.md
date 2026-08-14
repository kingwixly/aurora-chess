# Bans, anticheat, and this build

## Bans

Three scopes, because each defeats a different evasion:

- **Account** — stops that login.
- **IP** — stops a new account from the same connection. **Blunt**: a household
  or a school shares an address, so these should be short and are never issued
  automatically.
- **Device** — a client fingerprint that survives a new account and a VPN, but
  not a browser reinstall.

None is reliable alone. Together they raise the cost of evasion enough for a
club-sized site, which is the honest goal — someone determined, with a new
device and a mobile connection, will get back in.

Timed or permanent (`hours` omitted means permanent). Expiry is filtered **in
SQL**, so a stale ban cannot leak through. Lifted bans are kept as rows rather
than deleted: an account unbanned in error should still show what happened, and
an evasion pattern is only visible if the old bans survive.

Account bans revoke every session immediately rather than waiting for the
current access token to expire.

`GET /admin/users/:id/linked` shows accounts seen from the same address or
device, flagging which. **A shared device is much stronger evidence than a
shared address.**

## Anticheat

**It never punishes.** It produces a suspicion score and signals for a human.

That is a deliberate limit, not timidity: accuracy cannot distinguish a cheat
from a strong player having a good game. A forced sequence scores 100% for
whoever plays it. A system that bans on accuracy will ban improving players,
which is worse for a club than missing a cheat.

Signals: accuracy far above the player's **own** baseline (not an absolute bar —
90% means very different things at 1200 and 2400), an upset combined with that
lift, unusually uniform move times, and a fast rating climb which **only counts
alongside something else**. A climb alone scores zero; improvement is real.

Evidence floors: 20+ moves and a 10-game baseline. A 12-move miniature is often
100% accurate for both players.

**Exempt**: everyone holding a federation title (set automatically by the
migration) plus anyone staff clear. Their engine-like play is what the title
certifies.

Review threshold is 45 and deliberately high — a queue full of weak flags gets
ignored, and an ignored queue looks like oversight while providing none.

11 tests, including that a titled player scores zero however extreme the game.

## Also in this build

**Verify button removed.** It gated nothing.

**Flairs are back.** A flair is a badge you *wear*; badges are what you *hold*.
`FlairPicker` lets you choose from what you have earned, and the server checks
ownership because the field is user-settable.

**FIDE badge is now the lockup itself**, not a tick beside a label — for players
who want a title recognised while keeping rating and ID private.

**Homepage** now shows all ten titles, including HM/RM/OM.

**Fae set fixed properly.** Not just the queen — **every** white piece had
contamination, 616 pixels total. The sheet stacks a light piece above a dark one
with overlapping bounds, so a gap-based crop pulled in a sliver of the
neighbour. Connectivity could not catch it because the sliver touches the piece;
tone could, since a light piece has no dark pixels of its own.

**Spelling settled on British** — "analyse" throughout, 11 files changed. Routes
and API paths untouched.

**Fonts** — display face applied to buttons and headings across the play, bot,
friend, analysis and puzzle pages.

## Verified

24 migrations replay clean against Postgres 16, with ban expiry semantics
checked on real rows. Schema check clean. 223 shared + 244 web + 11 anticheat
tests. Every package and app typechecks.

## Next

**Friends messaging**, as agreed — schema, sockets, unread state, and the
friends page rework into list plus filter, with search separate.
