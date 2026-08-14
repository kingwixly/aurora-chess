# Where the big two fall short

Research across Trustpilot, ComplaintsBoard, the Lichess feedback forum, and
2026 app-review analyses. I have kept only the complaints that recur across
independent sources, and only the ones a club-sized site can actually act on.

Ordered by what I would build first.

---

## 1. Cheat bans with no explanation and no real appeal

**The single loudest complaint about Chess.com**, and the most damaging one.

<cite index="24-1">Players report that appeals are rarely granted, that the site does not close accounts unless it is "certain", and that only very occasionally does a borderline result lead to reopening an account.</cite> Chess.com's own policy states it does not share details of cheating investigations, so a banned player often cannot know what triggered it. <cite index="27-1">Roughly 0.6% of accounts have been closed for cheating, with a claimed one million bans in 2023 alone</cite> — at that volume even a small false-positive rate is a lot of wrongly banned people.

A forum post captures the real cost: a player who improved 900→1250 wrote that <cite index="24-1">it "almost feels like if you're someone who's working really hard to improve faster than average, you'll be labeled a cheater"</cite> — the system punishes the exact behaviour a chess site exists to encourage.

**What Aurora already does differently:** the anticheat produces a score and
named signals for a human, never an automatic ban, and titled players are
exempt because their accuracy is the point.

**What to build:**
- **Show the player their own report.** The signals that fired, in plain words.
  Not the thresholds — that is a cheating manual — but "your accuracy was far
  above your usual, in a game you won against a much stronger opponent."
- **An appeal that a human answers**, with the verdict recorded against the
  report. We already store `verdict` and `reviewedBy`; surface it.
- **Publish a fair-play page** stating that no ban is automatic, that titled
  players are exempt, and that every ban has a named reason. Trust is cheap to
  build at 100 users and impossible to retrofit at 10,000.

---

## 2. Improvement locked behind a paywall

<cite index="20-1">Analysed 1–3 star reviews across the five most-installed chess apps of 2026 found daily puzzle limits, lessons that stop after the first free one, and game analysis — "the single most-wanted improvement feature" — gated behind a paid tier. One reviewer: "Game review is the one thing that actually helps you improve and it is behind a membership."</cite> <cite index="18-1">Trustpilot reviewers likewise report that many essential features were paywalled and the subscription model felt forced.</cite>

**Aurora's advantage is structural, not moral:** analysis runs as Stockfish WASM
in the player's own browser, so it costs us nothing per game. There is no
economic pressure to meter it, ever.

**What to build:** say so, loudly, on the homepage. "Unlimited analysis and
unlimited puzzles, because they run on your machine." That is a real
differentiator, not a marketing line.

---

## 3. Generic coaching that ignores who is reading it

<cite index="19-1">A 2026 comparison found chess.com's Game Review uses "the same coaching language for a 400 ELO player and a 1900 ELO player" — a 600 player told they "missed an in-between move that maintained the initiative" learns nothing usable. It also analyses one game at a time, so it cannot tell you "you make this mistake every week."</cite>

Lichess has the mirror problem: <cite index="13-1">a forum request asks for "an explanation for each move and why it was good/bad/excellent", describing Lichess analysis as "more of a barebone" and the insights board as confusing for new players.</cite>

**What to build:**
- **Rating-banded explanations.** Our puzzles already carry hand-written
  per-move prose. Extend that to analysis: same position, different depth of
  explanation depending on the player's rating.
- **Cross-game patterns** — the gap neither site fills. We store every game and
  every accuracy figure. "You have hung a piece to a knight fork in 6 of your
  last 30 games" is worth more than any single-game report, and it is a query,
  not a research project.

---

## 4. Matchmaking that pairs mismatched players

<cite index="18-1">Trustpilot reviewers cite poor matchmaking that "frequently paired players with vastly different skill levels".</cite>

**Aurora is already better placed:** Glicko-2 knows how uncertain each rating
is, so the queue can widen the window by *confidence* rather than blindly by
time. **What to build:** prefer opponents whose rating deviation is similar —
pairing two uncertain players lets both find their level faster, and protects
settled players from volatile ones.

---

## 5. Friends are hard to reach

Recurring across the Lichess forum: <cite index="11-1">"I find it tricky to even start a game with my friends as they don't appear on the home screen"</cite>, and <cite index="9-1">an "inability to send match invitations or join games with friends seamlessly"</cite>.

**What to build:** an online-friends strip on the dashboard with a
one-click challenge. We have presence and friends already; this is an afternoon.

---

## 6. Redesigns that bury features behind "More"

<cite index="12-1">Lichess beta feedback: "the choice of hiding many features behind a proliferation of 'More' submenus is wrong, annoying and inelegant", alongside complaints that a rebuild from scratch is "always a user's painful experience".</cite> <cite index="10-1">Another: "much harder to navigate", "cluttered, complicated and tiring", "useful features harder to find or missing".</cite>

**The lesson for us, given how much we have redesigned:** every feature should
be reachable in two clicks from `/play`, and we should never move something
without leaving the old route working. Cheap now, impossible once people have
habits.

---

## 7. No offline play

<cite index="9-1">A top complaint about the Lichess app: no offline mode against the computer.</cite>

**Aurora is unusually well placed** — we are already a PWA with Stockfish
running locally. Bot games need no server at all. Caching the engine and the bot
roster would give us something neither site offers on mobile. Rated play stays
online, obviously.

---

## 8. Social depth

<cite index="16-1">Lichess is described as lacking "some of the advanced social features found on other platforms, such as comprehensive user profiles".</cite> <cite index="9-1">App reviewers also ask for more customisation and social features.</cite>

We are already ahead here — titles, badges, flairs, staff marks, FIDE panels,
and now messaging. **What to build:** clubs. A club-sized site whose users
*came* from a club should let them have a page, a member list, and a private
tournament.

---

## What I would not copy

**Lichess's approach of secretly pairing cheaters with each other** is elegant,
but it needs volume we do not have — with 100 players it just produces two
people staring at each other.

**Chess.com's silence about detection methods** is defensible at their scale and
wrong at ours. We can afford to explain, and explaining is most of what makes a
small site feel fair.
