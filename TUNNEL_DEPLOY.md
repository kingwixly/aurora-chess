# Deploying to aurorachess.org behind a Cloudflare Tunnel

Run these on the server, in order. Everything before step 5 is one-time setup.

---

## 1. Prerequisites

```sh
sudo apt update
sudo apt install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER
newgrp docker          # or log out and back in
```

Check the plugin is present — the tunnel overlay needs Compose v2.24+ for the
`!override` directive that removes nginx's published ports:

```sh
docker compose version
```

Node is only needed if you want to run the checks locally; the containers build
their own.

---

## 2. Get the code

```sh
git clone <your-repo-url> aurora
cd aurora
```

Or copy the zip across and unzip it. Either way, end up in the repo root — the
directory containing `bootstrap.sh`.

```sh
chmod +x bootstrap.sh
```

---

## 3. Create the tunnel in Cloudflare

In the Zero Trust dashboard → **Networks → Tunnels → Create a tunnel** →
*Cloudflared*. Name it `aurora`.

Copy the **token** from the install command — the long string after
`--token`. Do not run the install command they show; the compose overlay runs
cloudflared for you.

Then add three **public hostnames**, all pointing at the same service:

| Hostname | Service |
|---|---|
| `aurorachess.org` | `http://nginx:80` |
| `admin.aurorachess.org` | `http://nginx:80` |
| `standing.aurorachess.org` | `http://nginx:80` |

They all point at nginx because nginx routes between them on the `Host` header.

**Put Cloudflare Access in front of `admin.`** — Zero Trust → Access →
Applications, allowing only your email. Once the tunnel is up, that hostname is
reachable from the public internet, and the admin panel is the one surface where
that matters.

Do **not** put Access in front of `standing.` — a banned user has to reach it,
and that is the whole point of the standing site.

---

## 4. Bootstrap

```sh
AURORA_ADMIN_PASS='AviationFire3169!' ./bootstrap.sh --domain aurorachess.org --tunnel
```

It will stop and tell you `TUNNEL_TOKEN` is empty. Paste the token in:

```sh
nano .env
# TUNNEL_TOKEN=eyJhIjoi...
```

Then run the same command again. This time it goes through: generates secrets,
builds the images, runs migrations, seeds site settings, bots and puzzles, and
starts everything.

Watch the seed if you want to confirm it worked:

```sh
docker compose --env-file .env -f deployment/docker-compose.yml logs migrate | tail -20
```

You are looking for `Seeded 7 puzzles`.

---

## 5. Starting and stopping from here on

The tunnel overlay must be included **every time**, or you will start without
cloudflared and with nginx's ports published to the host — which is exactly what
the tunnel exists to avoid.

Save yourself the repetition:

```sh
echo "alias aurora='docker compose --env-file .env -f deployment/docker-compose.yml -f deployment/docker-compose.cloudflared.yml'" >> ~/.bashrc
source ~/.bashrc
```

Then:

```sh
aurora up -d          # start
aurora ps             # what is running
aurora logs -f api    # follow a service
aurora restart nginx  # after any rebuild — see below
aurora down           # stop
```

---

## 6. After any code change

```sh
git pull
aurora build
aurora up -d
aurora restart nginx
```

**The nginx restart is not optional.** It resolves upstream container IPs once at
startup and caches them, so a rebuilt api or web container gets a new IP and
nginx keeps talking to the old one. The symptom is a 502 on a site that is
otherwise running fine.

---

## 7. Verify

```sh
curl -s -o /dev/null -w '%{http_code}\n' https://aurorachess.org
aurora logs cloudflared | tail -5     # expect "Registered tunnel connection"
```

Then in a browser:

1. `https://aurorachess.org` loads
2. Log in as `dani`
3. `https://admin.aurorachess.org` prompts for Cloudflare Access, then loads
4. Play a bot game to completion — the rating should move
5. `https://standing.aurorachess.org/standing` loads and says your record is
   clean

---

## Things that will bite

**`NODE_ENV=production` is set by `--domain`,** which marks the auth cookie
`Secure`. That is correct behind a tunnel, since Cloudflare serves HTTPS. It
also means the site **will not keep you logged in over plain HTTP** — so do not
test by hitting the server's LAN address directly.

**Nothing is published on the host.** `curl localhost` from the server will
fail, and that is the tunnel working as intended. Test through the domain.

**Cloudflare caching.** If a change does not appear, purge the cache in the
dashboard before assuming a deployment problem. Consider a page rule bypassing
cache for `/api/*` if you see stale responses.

**A stale Postgres volume.** If the API cannot authenticate to the database
after changing `.env`, the volume was initialised with the old password.
Bootstrap now detects this before building, but if you hit it:

```sh
aurora down -v      # deletes ALL data
./bootstrap.sh --domain aurorachess.org --tunnel
```

**Back up before you have users:**

```sh
docker compose --env-file .env -f deployment/docker-compose.yml exec -T postgres \
  pg_dump -U postgres aurorachess | gzip > aurora-$(date +%F).sql.gz
```

Worth a cron entry once real accounts exist.
