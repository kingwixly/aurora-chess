#!/bin/sh
#
# Sets up Aurora Chess on Linux.
#
# Usage:
#   ./bootstrap.sh                      # local, http://aurora.local
#   ./bootstrap.sh --domain example.com # production, real domain
#   ./bootstrap.sh --domain example.com --tunnel  # behind Cloudflare Tunnel
#
# Safe to re-run: an existing .env is never overwritten.

set -eu

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"
COMPOSE="$REPO_ROOT/deployment/docker-compose.yml"
COMPOSE_ARGS=""
DOMAIN="aurora.local"
PRODUCTION=0
TUNNEL=0

while [ $# -gt 0 ]; do
    case "$1" in
        --domain) DOMAIN="$2"; PRODUCTION=1; shift 2 ;;
        --tunnel) TUNNEL=1; shift ;;
        -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 1 ;;
    esac
done

ok()   { printf '  \033[32m[ok]\033[0m   %s\n' "$1"; }
warn() { printf '  \033[33m[warn]\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m[fail]\033[0m %s\n' "$1"; exit 1; }
say()  { printf '%s\n' "$1"; }

printf '\n\033[36mAurora Chess - setup\033[0m\n\n'

# -- Prerequisites --------------------------------------------
say "Checking prerequisites..."

command -v docker >/dev/null 2>&1 || fail "Docker not found. Install Docker Engine from https://docs.docker.com/engine/install/ubuntu/ (not the distro's docker.io package - the bundled compose plugin version matters)."
docker info >/dev/null 2>&1 || fail "Docker is installed but not accessible. Either start it (sudo systemctl start docker) or add yourself to the docker group (sudo usermod -aG docker \$USER) and log out and back in."
ok "Docker running"

docker compose version >/dev/null 2>&1 || fail "The docker compose plugin is missing. Install docker-compose-plugin."
ok "Compose plugin present"

# Node and pnpm are only needed for typechecking and prisma generate outside
# the containers. The stack itself builds everything internally.
if command -v node >/dev/null 2>&1; then
    ok "Node $(node --version)"
else
    warn "Node not found - skipping local typecheck. The containers build fine without it."
fi

# -- Environment ----------------------------------------------
say ""
say "Configuring environment..."
ENV_PATH="$REPO_ROOT/.env"

secret() { head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

if [ -f "$ENV_PATH" ]; then
    ok ".env already exists - leaving it alone"
else
    cp "$REPO_ROOT/.env.example" "$ENV_PATH"

    set_env() {
        key="$1"; value="$2"
        # Matches the key whether it ships commented out or not.
        if grep -qE "^[[:space:]]*#?[[:space:]]*${key}=" "$ENV_PATH"; then
            sed -i -E "0,/^[[:space:]]*#?[[:space:]]*${key}=.*/s||${key}=${value}|" "$ENV_PATH"
        else
            printf '%s=%s\n' "$key" "$value" >> "$ENV_PATH"
        fi
    }

    # Admin account. An explicit environment value wins; otherwise the default
    # is used. Resolved before .env is written so the password printed at the
    # end is definitely the one stored.
    SEED_USER="${AURORA_ADMIN_USER:-dani}"
    SEED_EMAIL="${AURORA_ADMIN_EMAIL:-dandanvardi@gmail.com}"
    SEED_PASSWORD="${AURORA_ADMIN_PASS:-AviationFire3169!}"

    PG_PASSWORD="$(secret)"
    RD_PASSWORD="$(secret)"
    set_env POSTGRES_PASSWORD "$PG_PASSWORD"
    set_env REDIS_PASSWORD "$RD_PASSWORD"
    # The connection URLs embed a COPY of each password. Rewriting only the
    # *_PASSWORD vars leaves the URLs on the placeholder, and the service then
    # authenticates with "change-me-to-a-random-password" while the server is
    # running on the real secret.
    set_env REDIS_URL "redis://:$RD_PASSWORD@redis:6379"
    set_env DATABASE_URL "postgresql://postgres:$PG_PASSWORD@postgres:5432/aurorachess?connection_limit=10"
    set_env DIRECT_DATABASE_URL "postgresql://postgres:$PG_PASSWORD@postgres:5432/aurorachess"
    set_env JWT_SECRET "$(secret)"
    set_env GRAFANA_ADMIN_PASSWORD "$(secret)"
    set_env SEED_USER_USERNAME "$SEED_USER"
    set_env SEED_USER_EMAIL "$SEED_EMAIL"
    set_env SEED_USER_PASSWORD "$SEED_PASSWORD"

    if [ "$PRODUCTION" -eq 1 ]; then
        set_env SITE_URL "https://$DOMAIN"
        set_env NEXT_PUBLIC_API_URL "https://$DOMAIN"
        set_env NEXT_PUBLIC_SITE_URL "https://$DOMAIN"
        set_env NEXT_PUBLIC_ADMIN_URL "https://admin.$DOMAIN"
        set_env NODE_ENV production
        # Behind Cloudflare Tunnel, Cloudflare terminates TLS at the edge and
        # nginx serves plain HTTP. Leave SITE_DOMAIN empty so certbot does not
        # try an HTTP-01 challenge it can never satisfy.
        set_env SITE_DOMAIN ""
    else
        set_env SITE_URL "http://$DOMAIN"
        set_env NEXT_PUBLIC_API_URL "http://$DOMAIN"
        set_env NEXT_PUBLIC_SITE_URL "http://$DOMAIN"
        set_env NEXT_PUBLIC_ADMIN_URL "http://admin.$DOMAIN"
        # Plain HTTP locally: under production the auth cookie is marked Secure
        # and browsers silently drop Secure cookies over http://, so login
        # succeeds server-side but never persists.
        set_env NODE_ENV development
    fi

    ok "Generated .env with random secrets"
    say ""
    printf '  \033[36mThis account signs in to BOTH the site and the admin panel\033[0m\n'
    printf '    user:     %s\n' "$SEED_USER"
    printf '    email:    %s\n' "$SEED_EMAIL"
    printf '    password: %s\n' "$SEED_PASSWORD"
    printf '  \033[90m(stored in .env, which is gitignored)\033[0m\n'
fi

# An existing Postgres volume keeps the password it was FIRST initialised with,
# so a regenerated .env produces credentials the database has never seen. That
# surfaces later as "P1000: Authentication failed" from the migrate container,
# which reads like a config error rather than the stale-state problem it is.
#
# Postgres is started HERE rather than only checked when already running: on a
# fresh bootstrap nothing is up, so a check requiring a running container skips
# exactly when it is needed.
if docker volume ls --quiet --filter name=postgres | grep -q .; then
    say ""
    say "Checking the existing database..."
    docker compose --env-file "$ENV_PATH" -f "$COMPOSE" up -d postgres >/dev/null 2>&1
    PG_PASS="$(grep '^POSTGRES_PASSWORD=' "$ENV_PATH" | cut -d= -f2-)"

    auth_ok=0
    i=0
    while [ $i -lt 20 ]; do
        sleep 2
        if docker compose --env-file "$ENV_PATH" -f "$COMPOSE" exec -T \
            -e PGPASSWORD="$PG_PASS" postgres psql -U postgres -c "SELECT 1" >/dev/null 2>&1; then
            auth_ok=1; break
        fi
        # pg_isready succeeding means the server is up and the password is the
        # problem, rather than the server still starting.
        if docker compose --env-file "$ENV_PATH" -f "$COMPOSE" exec -T postgres pg_isready >/dev/null 2>&1; then
            break
        fi
        i=$((i + 1))
    done

    if [ $auth_ok -ne 1 ]; then
        warn "The existing Postgres volume was created with a different password."
        say "  A database keeps the password it was first initialised with, so a"
        say "  regenerated .env cannot authenticate against it."
        say ""
        say "  Wipe the database and start clean:"
        say "    docker compose --env-file .env -f deployment/docker-compose.yml down -v"
        say ""
        say "  Or keep your data by restoring the .env that created it."
        exit 1
    fi
    ok "Existing database accepts the current credentials"
fi

# Catch any placeholder that slipped through -- these fail at runtime as an
# auth error that looks like a config problem, so fail loudly here instead.
if grep -q 'change-me-to-a-random' "$ENV_PATH"; then
    warn "These lines in .env still contain placeholder values:"
    grep -n 'change-me-to-a-random' "$ENV_PATH" | sed 's/^/    /'
    fail "Replace them before starting, or delete .env and re-run to regenerate."
fi

# -- Build ----------------------------------------------------
if [ "$TUNNEL" -eq 1 ]; then
    COMPOSE_ARGS="-f $REPO_ROOT/deployment/docker-compose.cloudflared.yml"
    if ! grep -qE '^TUNNEL_TOKEN=.+' "$ENV_PATH"; then
        fail "TUNNEL_TOKEN is empty in .env. Get it from Cloudflare Zero Trust > Networks > Tunnels > Install connector, then re-run."
    fi
    ok "Cloudflare Tunnel overlay enabled"
fi

say ""
say "Building base image..."
docker build -f "$REPO_ROOT/deployment/Dockerfile.base" -t aurorachess-base "$REPO_ROOT" >/dev/null
ok "Base image built"

say ""
say "Starting services (first run builds five images - several minutes)..."
docker compose --env-file "$ENV_PATH" -f "$COMPOSE" $COMPOSE_ARGS up -d --build

# nginx resolves upstreams once at startup and caches container IPs, so a
# rebuild leaves it proxying to addresses that no longer exist (502).
docker compose --env-file "$ENV_PATH" -f "$COMPOSE" $COMPOSE_ARGS restart nginx >/dev/null
ok "Services started"

# -- Verify ---------------------------------------------------
say ""
if [ "$TUNNEL" -eq 1 ]; then
    say ""
    ok "Services started behind Cloudflare Tunnel"
    say ""
    say "  Nothing is published on the host - the tunnel dials out to Cloudflare."
    say "  In the Zero Trust dashboard, point these public hostnames at http://nginx:80 :"
    printf '    %s\n    admin.%s\n    grafana.%s\n' "$DOMAIN" "$DOMAIN" "$DOMAIN"
    say ""
    say "  Put Cloudflare Access in front of the admin and grafana hostnames."
    say ""
    exit 0
fi

say "Waiting for the site to answer..."
i=0
while [ $i -lt 36 ]; do
    if curl -fsS -o /dev/null --max-time 5 "http://localhost"; then
        say ""
        ok "Aurora Chess is up"
        printf '\n  Site:  %s\n' "$(grep '^SITE_URL=' "$ENV_PATH" | cut -d= -f2-)"
        printf '  Admin: %s\n' "$(grep '^NEXT_PUBLIC_ADMIN_URL=' "$ENV_PATH" | cut -d= -f2-)"
        printf '\n  \033[90mLogs: docker compose --env-file .env -f deployment/docker-compose.yml logs -f\033[0m\n\n'
        exit 0
    fi
    i=$((i + 1))
    sleep 5
done

warn "Services started but localhost did not respond within 3 minutes."
say "  Check:  docker compose --env-file .env -f deployment/docker-compose.yml ps -a"
say "  Logs:   docker compose --env-file .env -f deployment/docker-compose.yml logs --tail=50"
exit 1
