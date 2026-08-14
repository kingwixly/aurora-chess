# Roadmap — moderation, standing, and social

Nothing here is built yet. This is the map.

Ordered by dependency: each phase unblocks the ones under it. Phases 1–3 are one
coherent system and should not be split; 4–7 are independent and can be
reordered freely.

---

# Things that will fight you

Four points where the plan meets a hard constraint. Better argued now than
discovered mid-build.

## HWID does not exist in a browser

There is no hardware ID available to a web page. What we can do is a
**fingerprint** — canvas rendering, fonts, screen metrics, hardware concurrency,
timezone — hashed into a stable-ish string. It survives a new account, a cleared
cookie, and a VPN. It does **not** survive a browser change, a profile reset, or
in many cases a browser update.

So "HWID ban" is honest as a product name and dishonest as a technical promise.
My recommendation: keep the name in the admin UI, and in the user-facing text on
the standing page say **"device ban"**. Never tell a user their hardware is
banned; someone will test it in thirty seconds and learn that our claims are
unreliable.

Practical consequence: a device ban should be one signal among several, not the
sole basis for refusing a signup. Pair it with the IP and the account-creation
rate.

## "Unable to create another account while their session is stored"

A session cookie is under the user's control. Clearing it is one keystroke, and
anyone banned will clear it within a minute. This will not work as stated.

What actually works, in descending order of durability:
1. **Device fingerprint** — survives cookie clearing.
2. **IP**, with the caveat we already documented (households, schools, mobile
   carriers rotate).
3. **Email domain and address normalisation** — `a.b+tag@gmail.com` and
   `ab@gmail.com` are the same inbox. Worth catching, cheap to do.
4. **Signup velocity** — three accounts from one fingerprint in an hour is more
   suspicious than any single signal.

Keep the cookie check anyway — it costs nothing and catches the careless — but
do not rely on it.

## Discord-gated appeals and the 13+ policy

**Discord's own minimum age is 13.** So requiring a Discord account does not
filter anyone your policy excludes — a 13-year-old who can sign up here can sign
up there. The mechanism does not do the job you described.

It *does* do something real, though: it raises the effort of appealing, which
filters low-effort ban evaders rather than minors.

There is also a fairness cost. Someone with no Discord account, or who cannot
use it, would be locked out of appealing entirely — and appeals are exactly
where a wrongly banned person needs the least friction.

**Settled — this is the plan:** the on-site form is always available; Discord is
the expedited lane where volunteers triage, add context and flag a case. Same
outcome by either route, one is faster.

Worth stating on the fair play page in exactly those terms, so nobody assumes
Discord is required and gives up.

## The standing site must not be behind the ban check

The sharpest architectural point in the plan, and easy to get wrong.

`standing.aurora.local` needs the user to **log in while banned**. Our ban check
currently sits in the auth middleware, so as built a banned user cannot
authenticate — and therefore cannot see their standing or appeal.

The check becomes **scoped**, not global:

| Scope | Blocked when banned |
|---|---|
| `play` | yes |
| `social` (chat, friends, forums) | yes |
| `standing` | **no** |

A banned session authenticates normally and receives a `standing`-scoped token.
Every other route rejects it.

### Standing is reachable by everyone; appeals are gated on having a record

Two different rules, and the distinction is the point:

- **`/standing` is open to every signed-in account**, whatever their record —
  clean, one old warning, or twelve bans. Nobody is ever locked out of seeing
  their own history.
- **`/standing/appeal` requires at least one moderation record**, active *or*
  expired. An account that has never been actioned has nothing to appeal and
  gets a "nothing to appeal" state rather than an empty form.

The consequence worth calling out: **an expired strike is still appealable.**
Someone warned a year ago who believes it was wrong can contest it and have it
struck from their record. That is a real difference from how the big sites work,
where an expired action is simply permanent and unarguable.

So `Appeal` cannot be scoped to *active* punishments. It attaches to any
`Punishment` row, including one that has already become a strike, and a
successful appeal sets `overturnedAt` rather than merely expiring it.

Separately: **appeal-banned** is its own deliberate flag (`appealBanned` on
User). It blocks `/standing/appeal` and nothing else — `/standing` itself stays
readable, because a person should always be able to see what they are accused
of even when they have lost the right to argue about it.

---

# Phase 1 — Punishment model

Everything else depends on this. Build it first and completely.

## Punishment types

| Type | Play | Bots | Puzzles | Chat | Browse | Appealable |
|---|---|---|---|---|---|---|
| **Warning** | ✓ | ✓ | ✓ | ✓ | ✓ | yes — see below |
| **Restriction** | friends only | ✓ | ✓ | ✓ | ✓ | yes |
| **Suspension** | ✗ | ✓ | ✓ | ✓ | ✓ | yes |
| **Deactivation** | ✗ | ✗ | ✗ | ✗ | own profile + forums | yes |
| **Ban** | ✗ | ✗ | ✗ | ✗ | standing page only | see below |

Ban appealability:

| Ban | Duration | Appealable |
|---|---|---|
| Timed, < 3 days | as set | **no** |
| Timed, ≥ 3 days | as set | yes, unless disabled |
| Permanent (account) | forever | yes, unless disabled |
| IP | permanent | yes, unless disabled |
| Device | permanent | yes, unless disabled |

`appealsDisabled` is a moderator flag on the punishment, set manually or
automatically after **3 consecutive denied appeals**.

**Warnings are appealable too**, and so is any punishment that has already
expired into a strike. A warning constrains nothing, but it sits on the record
and counts toward escalation — so a person who thinks it was wrong has a real
stake in removing it. This is the direct consequence of standing being open to
everyone.

## Strikes

The idea that makes the record legible: **an expired or overturned punishment
becomes a strike.** Live punishments constrain; strikes are history.

- Warnings are strikes immediately.
- Restrictions, suspensions and deactivations become strikes on expiry or
  successful appeal.
- **Bans never become strikes.** They stay on the record as bans, as you said.
- An **overturned** punishment is marked as such rather than deleted. The record
  should show that something was raised and withdrawn — that is the honest
  version, and it protects both sides if the same dispute recurs.

### Strikes gate automatic titles

A strike on the record stops `computeAutoTitle` awarding anything. Manual titles
are unaffected — those are staff discretion already, and a GM does not stop being
a GM because they were rude once.

Mechanically this is small: one `strikes: number` field added to `TitleCriteria`
and a guard at the top of the rule list. Overturned punishments do not count.

**The design tension, which is worth deciding deliberately.** Titles are the
thing that makes Aurora distinct, so tying them to a clean record makes a warning
much heavier than it looks. Every warning becomes a potential title dispute, and
a moderator issuing one for a minor incident is quietly deciding that person
cannot be an Aurora Master until they ask support. That converts warnings from a
light-touch tool into the heaviest one you have, and staff will feel it as appeal
volume.

**Settled: a strike blocks automatic titles for 12 months, then stops counting.**
The record stays visible to staff forever; the title penalty expires. Long enough
that a player who wants a title has reason to appeal, short enough that it is not
a life sentence for one bad day, and irrelevant to players who do not care about
automatic titles.

Two implementation details this creates:

- **Expiry must trigger a recompute.** Otherwise a player whose block lapses does
  not receive their title until they happen to finish another rated game — they
  would sit at 2500 with no AM and no explanation. Either a nightly job over
  users whose newest strike just passed 12 months, or a lazy recompute on profile
  load. The nightly job is simpler to reason about and cheap at this scale.
- **A successful appeal must recompute immediately.** Overturning a strike and
  making someone wait for a cron run turns a win into another wait.

**Escalation decay follows the same clock**, for consistency: strikes stay
visible to staff permanently but stop counting toward the 3-and-5 escalation
thresholds after 12 months. One rule, one number, easy to state on the fair play
page. My recommendation is that
they remain visible to staff forever but stop counting toward escalation after
12 months. A club where a mistake at 14 follows you at 20 is not a club anyone
stays in. Escalation thresholds then read: 3 active strikes → automatic review,
5 → suspension considered.

## Schema

```
Punishment
  id, userId, type (WARNING|RESTRICTION|SUSPENSION|DEACTIVATION|BAN)
  scope (ACCOUNT|IP|DEVICE)        — for bans
  ip, deviceId                     — for bans
  reason              — shown to the user
  internalNote        — staff only, never sent
  expiresAt           — null = permanent
  appealsDisabled     boolean
  liftedAt, liftedBy, liftReason
  becameStrikeAt      — set when it expires
  overturnedAt        — set when an appeal succeeds; excluded from escalation
  issuedBy, createdAt

Appeal
  id, punishmentId, userId
  body                — the user's case
  source (SITE|DISCORD)
  discordHandle       — nullable, for the expedited lane
  status (OPEN|TRIAGED|ACCEPTED|DENIED)
  triagedBy           — Discord volunteer, if any
  triageNote
  decidedBy, decision, decidedAt
  createdAt

  UNIQUE(punishmentId, userId) WHERE status = OPEN   -- one open appeal at a time
```

`Ban` as it exists today becomes `Punishment` with `type = BAN`. One migration,
data carried across.

---

# Phase 2 — The standing site

`standing.aurora.local` → `standing.aurorachess.org`.

Fourth Next app, or a route group on the existing one with its own middleware.
**My recommendation: a route group**, not a fourth app — three deployables is
already a lot, and the standing pages share the auth store and design system.
nginx routes the subdomain to the same app; middleware pins it to `/standing/*`.

## Pages

- **`/standing`** — your record, reachable by every signed-in account whatever
  their history. Active punishments with what each blocks and when it ends; past
  strikes; ban history. A clean account sees "No action has been taken on your
  account", which is worth showing rather than 404ing. Written plainly: "You
  cannot play rated games until 4 March" beats "SUSPENSION active".
- **`/standing/appeal`** — form, one open appeal at a time. Shows why appealing
  is unavailable when it is: nothing on record, ban shorter than three days,
  appeals disabled by a moderator, an appeal already open, or three consecutive
  denials. **Any record is appealable, including an expired warning.**
- **`/standing/appeal/:id`** — the thread, including the moderator's decision
  and reasoning.

## The banner

Any active punishment renders a persistent banner across the main site linking
to the standing page. It is the first thing a punished user sees, everywhere.

## Auth

Scoped tokens as above. A banned user logs in, receives a `standing`-scoped
token, and every other route rejects it.

---

# Phase 3 — Reports and anti-cheat routing

## User reports

`Report` model: reporter, target, category (cheating, chat abuse, name, other),
optional game or message reference, body. Rate-limited per reporter to stop
grudge-reporting after a loss, which is what most post-loss reports are.

Two entry points: **profile → Report**, and **message → Report** for chat.

## Chat reports

The soft-delete we already have earns its keep here: a reported message stays
readable to staff even if the author deletes it after the fact.

## Anti-cheat routing

`assessGame` already produces a score and signals. Wire it to run after each
rated game and open a `CheatReport` above threshold.

**The decision you flagged — auto-ban or forward to staff.** My strong
recommendation is **forward, always**, for the reason the research turned up:
Chess.com bans automatically at scale and the resulting false positives are the
loudest complaint about the entire platform, with appeals that rarely succeed.
At 100 users you can afford a human on every case, and that is the single
biggest trust advantage a small site has. Revisit at 1,000+ if the queue becomes
unmanageable.

## Show the player their report

The differentiator from the research. When a punishment follows a cheat report,
the standing page shows the **signals in plain words** — "your accuracy was far
above your usual in a game against a much stronger opponent" — never the
thresholds, which would be a cheating manual.

---

# Phase 4 — Fair play page

Public, static, linked from the footer and the standing page. States:

- No ban is automatic; a human reviews every case.
- Titled and exempt players are not flagged by accuracy heuristics.
- Every punishment carries a reason, visible to the person it applies to.
- What we do and do not look at.
- How to appeal, both routes.

Cheap to write, and it is most of what makes a small site feel fair.

---

# Phase 5 — Profile identity

Largely built; this is completion.

**Exists:** titles, badges with pinning, flairs with ownership checks, staff
marks, FIDE panels, avatar URL, username changes with history.

**To add:**
- **Flair picker wired into settings.** The component exists and is not mounted.
- **Country flag** — `countryCode` on User, a picker, flag beside the name.
  Wanted by everyone, trivial, and it makes a club feel international.
- **Profile bio** — 300 characters, sanitised, no links initially. Links on a
  public profile are a spam vector and can wait for a trust signal.
- **Avatar upload** rather than a URL. Needs storage, size limits, and a
  moderation path. **The heaviest item in this phase** — the URL field works
  today, so this is a genuine "later".

---

# Phase 6 — Live game chat

Real-time chat during a game.

The design points that matter, all learned from what the big sites get wrong:

- **Off by default in rated games below a rating floor.** Most in-game chat at
  low ratings is tilt, and the people it lands on are the ones who leave.
- **Per-user mute, and a global "no chat" preference** that survives sessions.
- **Chat is disabled entirely by a restriction or suspension**, per the
  punishment table.
- Messages persist with the game so a report has something to point at.
- Rate-limited hard: 5 messages per 30 seconds. Nobody needs more mid-game.

---

# Phase 7 — Coaching bands and friends strip

## Rating-banded explanations

The research finding: the same coaching text is served to a 400 and a 1900, and
it helps neither.

Content model: each explanation template carries a band (`<1000`, `1000–1400`,
`1400–1800`, `1800+`). Same position, different depth. Our puzzles already have
hand-written per-move prose, which is the hard part — this extends the pattern
to analysis.

Second half, which neither big site does: **cross-game patterns.** "You have
hung a piece to a knight fork in 6 of your last 30 games." We store every game
and every accuracy figure; this is a query, not research.

## Friends strip

Online friends on the dashboard, one-click challenge. Presence and friends both
exist. An afternoon's work, and it fixes the most-repeated Lichess complaint in
the research.

---

# Later

- **Club pages** — as you said, post-release. Member list, private tournaments,
  a page. Natural fit for a site whose users came from a club.
- **Offline bot play** — PWA plus local Stockfish means bot games need no
  server. Neither big site offers it on mobile.
- **Google sign-in** — still needs OAuth credentials.

---

# Suggested order

1. **Punishment model** — everything depends on it
2. **Standing site + scoped auth** — punishments are meaningless without a way
   to see and contest them
3. **Reports + anti-cheat routing** — fills the queue the standing site answers
4. **Fair play page** — cheap, and it explains 1–3
5. **Friends strip** — small, high value, unblocks nothing but feels good
6. **Profile identity** — flags, bio, flair picker mounted
7. **Live game chat** — needs the punishment model to gate it
8. **Coaching bands**

## Public appeals — the Discord lane

Your reasoning is sound: posting a lie in front of readers is harder than
submitting one to a form, and volunteers who read appeals can surface the genuine
cases fast. That is a real mechanism, not wishful thinking.

Four things to build around, because publishing an appeal publishes more than the
appeal.

**A public appeal publishes an accusation.** The reason field says why someone
was actioned — "suspected engine use" — and that becomes visible before anyone
has decided whether it was true. If the appeal succeeds, the accusation is
already public and the correction never travels as far. Mitigation: the appeal
post carries the *user's* account and the punishment *type*, and the full reason
only appears once the person chooses to include it. Let them decide how much to
expose about themselves.

**Minors.** The site is 13+, so some appellants are children. Handled by the
same two safeguards as everything else here: the lane is opt-in, and the post is
deletable at any time.

**Crowds are not reliably respectful.** Handled by moderating the forum, with the
same punishment ladder applying there as anywhere.

**No-real-names rule.** Worth writing so it covers **screenshots**, not just
typed text — that is where personal information actually leaks. A cropped
screenshot of a game with a real name in the sidebar defeats a rule that only
mentions posts.

**Decisions must not follow sentiment.** The most important one. Volunteers
triage and flag; **moderators decide on evidence.** If a well-liked player gets
overturned and an unpopular one does not, for the same facts, the system is worse
than a slow queue — it is a popularity contest with a moderation badge on it.
Build it so the decision record shows the evidence, not the thread.

**The structural safeguards, both already in your plan:** the on-site form is
private and always open, and a public post can be withdrawn at any time with no
consequence. Together those make the public lane genuinely optional rather than
nominally optional.

Two implementation details that make "no repercussions" true rather than stated:

- **Withdrawing a public post must not reset queue position.** If switching to
  the private route sends someone to the back of the line, withdrawal carries a
  cost and the choice is not free. The `Appeal` row is the same row either way;
  only `source` changes.
- **Deleting the public post soft-deletes it**, exactly like chat messages.
  Staff keep what was written — a moderator deciding a case needs the full
  history, and someone who posts an admission and deletes it should not have
  erased it from the decision record. The post disappears publicly and
  immediately; it stays in the case file.

Worth watching once volumes are real: if the private queue starts taking a week
while the public one takes an hour, the choice becomes coercive in practice even
though it is free on paper.

## Decisions I need from you before phase 1

1. ~~Do strikes decay?~~ — settled: visible to staff forever, stop counting for
   both escalation and the automatic title block after 12 months.
2. **Auto-ban or always forward?** My strong recommendation: always forward.
3. **Standing site — route group or fourth app?** My recommendation: route
   group.
4. ~~Discord appeals~~ — settled: expedited lane, on-site form always open.
5. ~~Is `/standing` public?~~ — settled: every account can always reach its own
   record. Not a browsable register.
6. ~~Title-block option?~~ — settled: 12 months.
