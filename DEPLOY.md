# Deploying Aurora Chess

Two supported setups: local development on Windows, and 24/7 on Ubuntu behind a
Cloudflare Tunnel.

## Windows (local testing)

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\bootstrap.ps1
```

Serves on `http://aurora.local` with the admin app on `http://admin.aurora.local`.
Add both to `C:\Windows\System32\drivers\etc\hosts` pointing at `127.0.0.1`
(Notepad as Administrator) if the script reports them missing.

**Why not `localhost`?** The auth cookie is scoped to the registrable domain so
the admin subdomain can share it. A single-label host has no registrable domain,
so the cookie ends up host-only and the admin panel can never see it.

Local runs set `NODE_ENV=development` deliberately. Under `production` the auth
cookie is marked `Secure`, and browsers silently drop `Secure` cookies over
plain HTTP — login returns 200 and never persists.

## Ubuntu server, 24/7, Cloudflare Tunnel

### 1. Create the tunnel

Cloudflare Zero Trust → Networks → Tunnels → Create. Copy the connector token.

### 2. Deploy

```sh
git clone https://github.com/kingwixly/aurora-chess.git
cd aurora-chess
./bootstrap.sh --domain yourdomain.com --tunnel
```

It will stop and tell you to set `TUNNEL_TOKEN` in `.env` on the first run.
Paste the token, re-run.

### 3. Route the hostnames

In the tunnel's Public Hostname tab, add all three pointing at
**`http://nginx:80`** — nginx routes between them on the Host header:

| Hostname | Service |
|---|---|
| `yourdomain.com` | `http://nginx:80` |
| `admin.yourdomain.com` | `http://nginx:80` |
| `grafana.yourdomain.com` | `http://nginx:80` |

### 4. Lock down admin

**Put Cloudflare Access in front of `admin.` and `grafana.`** Once the tunnel is
up they are reachable from the public internet, and the admin app has no login
page of its own — it trusts a cookie set by the main site. Access is the second
gate.

## What the tunnel overlay changes

- Adds `cloudflared`, which dials **out**. No inbound ports, no port
  forwarding, no DDNS, home IP hidden.
- **Removes nginx's published ports.** Nothing reaches the host directly;
  cloudflared talks to nginx over the Docker network. Leaving 80/443 published
  would expose the origin and defeat the tunnel.
- **Disables certbot.** Cloudflare terminates TLS at the edge, so there is no
  inbound path for an HTTP-01 challenge and no certificate to renew. Leave
  `SITE_DOMAIN` empty.

`ports: !override []` needs Compose v2.24+. On older Compose, delete the ports
block from `docker-compose.yml` by hand.

## Operational notes

**Restart nginx after any rebuild.** It resolves upstreams once at startup and
caches container IPs, so rebuilding `web` or `api` leaves it proxying into the
void — a 502 that looks like a config problem.

```sh
docker compose --env-file .env -f deployment/docker-compose.yml restart nginx
```

**`NEXT_PUBLIC_*` are build-time.** Next bakes them into the bundle, so changing
them in `.env` requires `--build`, not a restart. They are passed as build args
in `docker-compose.yml`; without that the frontend would always call
`http://localhost`.

**Backups belong on the other disk.** `backup.sh` output should not sit on the
same physical drive as the database it protects.

**Firewall.** With a tunnel the box needs zero inbound ports except SSH, and
that can be scoped to your LAN:

```sh
sudo ufw default deny incoming
sudo ufw allow from 192.168.0.0/16 to any port 22
sudo ufw enable
```

## Schedule the puzzle cutoff

PM is a percentile, recomputed over the population rather than a fixed bar.
Until this runs, PM is disabled (cutoff 0), which is correct on a small site.

```sh
# crontab -e, weekly
0 4 * * 0 cd /path/to/aurora-chess && docker compose --env-file .env \
  -f deployment/docker-compose.yml exec -T api \
  node -e "require('./dist/lib/titles.js').recomputePuzzleCutoff()"
```
