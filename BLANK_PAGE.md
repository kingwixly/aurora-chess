# If /play is blank

The most likely cause is the **service worker**, not the code. `next-pwa` is
configured with `NetworkFirst` on pages and a 5-second network timeout, so a
shell cached from an earlier build can be served indefinitely after a rebuild —
and a shell that references JS chunks which no longer exist renders as a blank
page with no visible error.

Try this before anything else:

1. F12 → Application → Service Workers → **Unregister**
2. Application → Storage → **Clear site data**
3. Hard reload (Ctrl+Shift+R)

If it comes back, that was it, and it will recur on every rebuild during
development. `disable: process.env.NODE_ENV === "development"` in
`next.config` already handles the dev server, but you are running the
production image locally, so the SW is active.

## If it is still blank

Then it is a runtime crash, and I need the console:

F12 → **Console** tab → reload → paste the first red error.

Also useful — check whether the HTML arrived at all:

```powershell
curl.exe -s http://aurora.local/play | Select-Object -First 20
```

Markup present but nothing rendered means a client-side hydration crash.
Nothing at all means the server component threw, and
`docker compose --env-file .env -f deployment/docker-compose.yml logs web`
will have the stack trace.
