# SSH access without Cloudflare Access

Entirely CLI. You authorise a key once; after that you connect from any device
on any network with `ssh aurora`.

## Why not just open port 22

You could forward 22 on the router and be done in five minutes. Two reasons not
to:

**It is found immediately.** A residential IP with 22 open gets its first
credential-stuffing attempt within hours, and then a few thousand a day
forever. None of them will succeed against key-only auth, but the noise buries
anything real in your logs.

**It exposes your home address.** The IP that answers is where you live. That
is a different category of thing to leak than a chess site going down.

So: Cloudflare Tunnel carries the SSH traffic, exactly as it already carries
the website. No inbound ports, and the origin IP is never published. What
changes is that **Access is removed** - no browser login, no identity provider,
no six-digit codes. Authentication becomes the SSH key and nothing else.

## One-time setup on the server

The tunnel already runs for the website. This adds an SSH route to it.

```sh
cd ~/aurora
```

Add to your existing tunnel config. If you are using the
`docker-compose.cloudflared.yml` file already in the repo, the ingress list
lives in the cloudflared config it mounts:

```yaml
ingress:
  # existing website rules stay exactly as they are, above this
  - hostname: ssh.aurorachess.org
    service: ssh://localhost:22
  - service: http_status:404
```

Then create the DNS route:

```sh
docker compose --env-file .env -f deployment/docker-compose.yml \
  -f deployment/docker-compose.cloudflared.yml \
  exec cloudflared cloudflared tunnel route dns aurora ssh.aurorachess.org
```

Restart the tunnel:

```sh
docker compose --env-file .env -f deployment/docker-compose.yml \
  -f deployment/docker-compose.cloudflared.yml restart cloudflared
```

## Lock the server down

This is the part that actually provides the security. Do it before you rely on
the tunnel, and **keep your current session open** while you test - locking
yourself out of a machine in your own house is annoying, doing it to one that
is serving a live site is worse.

```sh
sudo nano /etc/ssh/sshd_config
```

Set these:

```
PasswordAuthentication no
PubkeyAuthentication yes
PermitRootLogin no
KbdInteractiveAuthentication no
```

`PasswordAuthentication no` is the important one. With it off, a stolen or
guessed password is worthless and the only way in is a key you have explicitly
authorised.

```sh
sudo systemctl restart ssh
```

Test from a second terminal **before closing the first**.

## Authorise a key

On the device you want to connect from:

```sh
ssh-keygen -t ed25519 -C "laptop"
```

Ed25519 rather than RSA: shorter, faster, and no key-size decision to get
wrong.

Copy the public key - the `.pub` file, never the other one:

```sh
cat ~/.ssh/id_ed25519.pub
```

On the server, add that single line:

```sh
nano ~/.ssh/authorized_keys
```

One key per line. Permissions matter, and sshd silently refuses keys if they
are wrong:

```sh
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Connect from anywhere

Each client needs `cloudflared` installed - it is what carries the connection
to the tunnel.

**Windows:**

```powershell
winget install --id Cloudflare.cloudflared
```

**macOS:**

```sh
brew install cloudflared
```

Then add this to `~/.ssh/config` (on Windows,
`C:\Users\you\.ssh\config`):

```
Host aurora
  HostName ssh.aurorachess.org
  User aurora-machine
  ProxyCommand cloudflared access ssh --hostname %h
  IdentityFile ~/.ssh/id_ed25519
```

And then, from any network:

```sh
ssh aurora
```

## Revoking a device

Delete its line from `~/.ssh/authorized_keys`. That is the whole procedure, and
it takes effect on the next connection attempt. This is why one key per device
is worth the small extra effort - a shared key cannot be revoked for one
machine.

To see what is authorised:

```sh
cat ~/.ssh/authorized_keys
```

## If you get locked out

The tunnel is not the only way in. You still have physical access to the
machine, and a keyboard attached to it bypasses all of this. That is the
fallback, and it is the reason none of the above is dangerous to attempt.

## What this does not do

It does not authenticate against Aurora accounts. Being an admin on the site
gives you no shell access and never should - the two systems stay separate on
purpose, so a compromised web session cannot become a shell.
