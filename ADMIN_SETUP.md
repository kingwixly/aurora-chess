# Admin account and the staff mark

## If your last bootstrap printed a random password

That run used the OLD script. The bootstrapper already generated its own random
`SEED_USER_PASSWORD` and printed it, and my block then overwrote the file
afterwards — so **the password it printed was not the password stored**. Two
blocks were fighting over the same variable.

They are merged now: one block resolves the account before `.env` is written,
so the printed value is definitionally the stored one. I verified it by running
the shell logic and diffing printed against stored.

To pick up the fix on an existing install, delete `.env` and re-run bootstrap
(it leaves an existing `.env` alone by design), or just edit the three
`SEED_USER_*` lines by hand.

## Your account is created automatically

Both bootstrappers now write your details into `.env`, and the seed creates the
account on first boot:

```
username  dani
email     dandanvardi@gmail.com
role      ADMIN
```

Because `role` is `ADMIN`, the account also gets the staff mark beside its name
with no second step.

To use different details on the server, set these before running bootstrap and
it will use them instead:

```powershell
$env:AURORA_ADMIN_USER  = "dani"
$env:AURORA_ADMIN_EMAIL = "you@example.com"
$env:AURORA_ADMIN_PASS  = "..."
.\bootstrap.ps1
```

```sh
AURORA_ADMIN_PASS='...' ./bootstrap.sh
```

## Where the password lives — and where it does not

Credentials are written to **`.env`**, which is gitignored. They are **not** in
`.env.example`, which is committed.

This distinction is the reason for the one piece of pushback below.

## The pushback: it is not about hackers

Your reasoning about attackers is sound. The realistic exposure is something
duller:

- **A private repo does not stay private.** Adding a collaborator, going public
  later, a fork, or a support ticket with a zip attached all expose history.
  Git keeps deleted secrets forever — removing it in a later commit does not
  remove it.
- **You will reuse this password.** Everyone does, under time pressure, on the
  server, at 2am. The moment it protects something that matters, its being in a
  file changes from harmless to not.
- **It is your real email**, so a leak links a working credential pair to an
  identity, which is what makes automated credential-stuffing effective.

The mitigation costs nothing and I have applied it: the password lives only in
the gitignored `.env`, and the bootstrappers read an environment variable first,
so you can override it without touching a tracked file.

**One thing worth doing after first login:** change the password from Settings.
It then exists only as a bcrypt hash in your database, and the value in `.env`
stops mattering.

## The staff mark

Now the knight badge you uploaded, at `/icons/staff-mark-{32,64,128}.png`.

Two changes to the source art:

- **The wordmark was cropped off.** "TEAM" belongs to the logo lockup, not to a
  16px badge beside a username.
- **The knight was lightened** to a pale blue. The original navy is very close
  to the header background — at 16px it vanished entirely and left the ribbon
  floating with no piece under it. Verified at 16, 22 and 32px on the real
  background before shipping.

Deliberately a different mark from the favicon: the favicon says "this is
Aurora", the badge says "this person is Aurora staff". One image doing both
would make every browser tab look like a staff badge.

**A bug this surfaced:** `staffRank` was never written by anything, so the mark
would never have appeared for anyone. It now derives from `role` — an admin gets
"Admin" automatically — while a custom label set by staff still wins.

## Verified

Schema check, route check, 259 + 307 + 244 tests, all packages typecheck, both
bootstrappers pass syntax checks and are pure ASCII.
