# Release checklist

Work through this in order. Each step assumes the one before it succeeded.

## 1. Configuration

The API now **refuses to start** on a bad configuration rather than failing at
the first sign-in. It checks:

- `DATABASE_URL`, `JWT_SECRET` (32+ characters), `REDIS_URL` all present
- No value still containing a placeholder like `change-me`
- In production: `COOKIE_SECURE` not false, `CORS_ORIGIN` set

If it exits at boot, the log lists **every** problem at once rather than one per
restart.

## 2. Database

```powershell
docker compose --env-file .env -f deployment/docker-compose.yml down -v
.\bootstrap.ps1
```

The bootstrap now starts Postgres itself and verifies the password before
building anything, so a stale volume fails in ten seconds rather than three
minutes into a build.

## 3. Seeding — automatic

**There is nothing to run.** The `migrate` container migrates and then seeds
site settings, bots and puzzles, in that order, every time the stack comes up.

Puzzles used to be a manual step. That was a mistake: without them `/puzzles`
shows an error, and "run one extra command after every deploy" is a step that
eventually gets skipped. It is in the chain now.

Every seed upserts, so re-running against an existing database is safe. Puzzle
text is refreshed; attempt counts and drifted ratings are left alone.

Watch it happen:

```powershell
docker compose --env-file .env -f deployment/docker-compose.yml logs migrate
```

You are looking for `Seeded 7 puzzles` near the end. If the container exited
non-zero, nothing after the failing step ran — read upward for the first error
rather than the last.

### Re-running a seed by hand

Rarely needed, but if you edit `bots.yml` or the puzzle set and do not want a
full restart:

```powershell
docker compose --env-file .env -f deployment/docker-compose.yml run --rm migrate `
  sh -c "export DATABASE_URL=$env:DIRECT_DATABASE_URL; pnpm --filter @aurora/api run db:seed-puzzles"
```

Use `run --rm migrate`, not `exec api`: the API container is a production build
without `tsx` or the seed scripts, so `exec api` will fail with a missing
command. The bot roster additionally needs `FORCE_RESEED=1` to overwrite rows
that already exist, because the bot seeder preserves admin edits by default.

## 4. First account

The first account to register gets `accountNumber` 1 and the Founder badge
automatically. Promote it to admin directly in the database:

```sql
UPDATE "User" SET role = 'ADMIN', "staffRank" = 'Admin' WHERE username = 'yourname';
```

`role` grants access; `staffRank` is the public mark beside the name. They are
deliberately separate — someone can be recognised publicly without holding admin
rights, and vice versa.

## 5. Smoke test

In order, because each depends on the last:

1. Register, log in, log out, log back in
2. Play a bot game to completion — check the rating moves
3. **Resign a game against a friend** — this specifically was broken until
   recently and scored as a draw
4. Solve a puzzle, check the puzzle rating moves
5. Open the analysis board, paste a PGN, play the position against the engine
6. Send a friend request, accept it, send a message
7. From the admin panel: issue a warning to a test account, confirm the banner
   appears, appeal it from `/standing`, accept the appeal, confirm the banner
   clears

## 6. Moderation smoke test

The part most worth testing before real users arrive, because the failure mode
is someone unable to contest a ban:

1. Ban a test account
2. **Confirm it can still sign in** and reach `/standing`
3. Confirm every other page redirects there
4. Appeal, accept the appeal, confirm access returns

## What is deliberately not automatic

**No ban is issued by software.** Screening opens a report for a human and
stops. If the review queue ever becomes unmanageable, revisit — but a false
positive costs more than a missed cheat at this scale.

## Known gaps

- **Avatar upload** — the URL field works; file storage does not exist
- **Cross-game pattern detection** — logic and tests exist, the query does not
- **Google sign-in** — needs OAuth credentials
- **Club pages, offline bot play** — future work
