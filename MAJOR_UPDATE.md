# Major update

## Your three questions, checked before answering

**Email verification is wired and auto-sends.** `sendVerificationEmail` fires
on registration (`auth.ts:189`) plus a resend path. That works.

**There was no staff email panel.** The admin app had only audit-log, bots,
games, moderation, settings, users. The support API had been complete for
several versions with nothing rendering it, so tickets were curl-only.
**Built now** at `/support`.

**There was no verify button.** The endpoint has always accepted a `verified`
boolean; only the control was missing. **Added** to both the desktop table and
the mobile cards.

**Moderation was fixed** in the previous batch - `useToast((s) => s.show)`, the
stable selector.

## Game analysis: two separate bugs

**You could not move pieces.** `movable.color` resolved to `orientation`, which
is white. Black's pieces were undraggable, so exploring any line for black was
impossible. Chessground accepts `"both"`, which is what an analysis board
actually wants.

**Moves did not load** because the page returned early with an Analyse prompt
whenever no analysis existed - no board, no move list, nothing. That reads as a
failure to load rather than "not analysed yet". It now renders the game with a
banner over it, and the board, move list and last-move highlight all fall back
to the game's own moves.

## Blog and forum

Separate models rather than one with a type flag: a post is staff-authored and
is the site speaking, a thread is anyone's and is a conversation. Merged, every
permission check would need the flag anyway.

- `/blog` and `/blog/[slug]`, public, drafts excluded
- `/forum`, `/forum/new`, `/forum/[id]` with four fixed boards
- Admin editor at `/blog` in the panel, drafts by default
- Thread pin, lock and soft-delete for staff

Three decisions worth stating:

**Threads sit behind the chat capability**, not a new one. Someone silenced for
how they talk in games should not get a fresh audience in the forum.

**Deletes are soft, and leave a tombstone.** A conversation that loses its
middle stops making sense.

**Slugs are generated once and never regenerated on edit**, because changing
one breaks every link already shared. Collisions get a numeric suffix rather
than an error thrown at whoever is writing.

## Board player UI

- Click a name to reach the profile (already worked)
- **Hover cards**: rating, W/L/D, win percentage, games played, join date,
  badges. Cached per username, since an opponent gets hovered repeatedly
- **Country flags** beside names on the board
- Titles and flairs (already worked)
- **Focus mode** on `z`, Escape to leave. `f` was already board flip, and a key
  that does two things depending on context is worse than an unfamiliar one.
  The clocks stay visible - time pressure is exactly when someone reaches for
  this, and hiding the clock would be actively harmful

## Also fixed

**Board clipping.** `h-[100dvh]` with `overflow-hidden` meant that on any window
shorter than the board plus both player strips, the strips were cut off with no
way to scroll to them. Now `min-h` and scrollable.

**Em-dashes**: 101 files.

**Puzzle explanations** cut from 8,472 to 7,176 characters, longest now 221.

**Homepage** hero down from `text-6xl` to `text-4xl`, gradient on a short phrase
rather than a whole line, and the tagline reworded. Enormous display type over a
gradient is the house style of every generated landing page.

**A close button** on the game-over modal.

**Local play hidden on desktop** - both modes assume a phone shared between two
people sitting together.

## SSH

`SSH.md`. Cloudflare Tunnel carries the SSH traffic as it already carries the
site; **Access is removed**, so no browser login and no identity provider.
Authentication is the key and nothing else.

Includes the sshd hardening that actually provides the security, key
authorisation and revocation, and the warning to keep a session open while
testing.

It deliberately does **not** authenticate against Aurora accounts. Being a site
admin should never grant shell access - kept separate so a compromised web
session cannot become a shell.

## Verified

359 shared, 342 API, 259 web tests. All six checks clean. 33 migrations replay
from empty.

## Not done

Engine switching UI in settings, and the remaining bugfix pile.
