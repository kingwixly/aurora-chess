<#
.SYNOPSIS
    Sets up Aurora Chess for local development on Windows.

.DESCRIPTION
    Checks prerequisites, generates a .env with real random secrets, builds the
    base image, and brings the stack up. Safe to re-run: an existing .env is
    never overwritten.

.PARAMETER Hostname
    Hostname to serve on. Defaults to aurora.local.

    Do not use "localhost". The auth cookie is scoped to the registrable domain
    so that the admin subdomain can share it, and a single-label host like
    localhost has no registrable domain - the cookie ends up host-only and the
    admin panel can never see it.

.PARAMETER SkipHosts
    Skip the hosts-file check (which needs an elevated shell to fix).

.EXAMPLE
    .\bootstrap.ps1
.EXAMPLE
    .\bootstrap.ps1 -Hostname aurora.test
#>
param(
    [string]$Hostname = "aurora.local",
    [switch]$SkipHosts
)

$ErrorActionPreference = "Stop"
$RepoRoot = $PSScriptRoot
$Compose = Join-Path $RepoRoot "deployment\docker-compose.yml"

function Say([string]$m, [string]$c = "White") { Write-Host $m -ForegroundColor $c }
function Ok([string]$m)   { Say "  [ok]   $m" "Green" }
function Warn([string]$m) { Say "  [warn] $m" "Yellow" }
function Fail([string]$m) { Say "  [fail] $m" "Red"; exit 1 }

Say "`nAurora Chess - local setup`n" "Cyan"

# -- Prerequisites --------------------------------------------
Say "Checking prerequisites..."

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Fail "Node.js not found. Install Node 22 LTS from https://nodejs.org"
}
$nodeMajor = [int](((node --version) -replace '^v','') -split '\.')[0]
if ($nodeMajor -lt 22) { Fail "Node 22+ required, found v$nodeMajor" }
Ok "Node $(node --version)"

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    Warn "pnpm not found - enabling via corepack"
    try {
        corepack enable 2>&1 | Out-Null
        corepack prepare pnpm@10.32.1 --activate 2>&1 | Out-Null
    } catch {
        Fail "corepack could not write its shims. Run these in an ADMIN PowerShell, then re-run:`n    corepack enable`n    corepack prepare pnpm@10.32.1 --activate"
    }
}
Ok "pnpm $(pnpm --version)"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Fail "Docker not found. Install Docker Desktop and make sure it is RUNNING (whale icon steady), then open a new terminal."
}
try { docker info 2>&1 | Out-Null } catch { Fail "Docker is installed but not running. Start Docker Desktop and wait for the whale icon to settle." }
Ok "Docker running"

# -- Hosts file -----------------------------------------------
if (-not $SkipHosts) {
    Say "`nChecking hosts file..."
    $hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
    # Read as one string: -match against an ARRAY returns the matching
    # elements rather than a boolean, so an array test here is always truthy.
    $hostsText = Get-Content $hostsPath -Raw -ErrorAction SilentlyContinue
    if ($null -eq $hostsText) { $hostsText = "" }
    $needed = @($Hostname, "admin.$Hostname")
    $missing = $needed | Where-Object {
        # Anchor to an IP + hostname line and require the name to END the
        # entry, else "aurora.local" also matches the admin.aurora.local line.
        $pattern = '(?m)^[ \t]*[0-9a-fA-F:.]+[ \t]+' + [regex]::Escape($_) + '[ \t]*$'
        $hostsText -notmatch $pattern
    }
    if ($missing) {
        Warn "Missing hosts entries. Add these to $hostsPath (Notepad as Administrator):"
        foreach ($h in $missing) { Say "    127.0.0.1  $h" "Yellow" }
        $ans = Read-Host "  Continue anyway? (y/N)"
        if ($ans -ne "y") { exit 1 }
    } else {
        Ok "$Hostname and admin.$Hostname resolve"
    }
}

# -- Environment ----------------------------------------------
Say "`nConfiguring environment..."
$envPath = Join-Path $RepoRoot ".env"

function New-Secret { -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Maximum 16) }) }

if (Test-Path $envPath) {
    Ok ".env already exists - leaving it alone"
} else {
    Copy-Item (Join-Path $RepoRoot ".env.example") $envPath
    # Admin account. An explicit environment value wins; otherwise the default
    # is used. Resolved HERE, before .env is written, so the password printed
    # below is definitely the one stored: a second block rewriting it afterwards
    # printed one value and saved another.
    $seedUser     = if ($env:AURORA_ADMIN_USER)  { $env:AURORA_ADMIN_USER }  else { "dani" }
    $seedEmail    = if ($env:AURORA_ADMIN_EMAIL) { $env:AURORA_ADMIN_EMAIL } else { "dandanvardi@gmail.com" }
    $seedPassword = if ($env:AURORA_ADMIN_PASS)  { $env:AURORA_ADMIN_PASS }  else { "AviationFire3169!" }

    $pgPassword = New-Secret
    $rdPassword = New-Secret

    $map = @{
        "POSTGRES_PASSWORD"      = $pgPassword
        "REDIS_PASSWORD"         = $rdPassword
        # The connection URLs embed a COPY of each password. Rewriting only the
        # *_PASSWORD vars leaves the URLs on the placeholder, and the service
        # then authenticates with "change-me-to-a-random-password" while the
        # server runs on the real secret.
        "REDIS_URL"              = "redis://:$rdPassword@redis:6379"
        "DATABASE_URL"           = "postgresql://postgres:$pgPassword@postgres:5432/aurorachess?connection_limit=10"
        "DIRECT_DATABASE_URL"    = "postgresql://postgres:$pgPassword@postgres:5432/aurorachess"
        "JWT_SECRET"             = New-Secret
        "GRAFANA_ADMIN_PASSWORD" = New-Secret
        "SEED_USER_USERNAME"     = $seedUser
        "SEED_USER_EMAIL"        = $seedEmail
        "SEED_USER_PASSWORD"     = $seedPassword
        "SITE_URL"               = "http://$Hostname"
        "NEXT_PUBLIC_API_URL"    = "http://$Hostname"
        "NEXT_PUBLIC_SITE_URL"   = "http://$Hostname"
        "NEXT_PUBLIC_ADMIN_URL"  = "http://admin.$Hostname"
        # Local runs are plain HTTP. Under NODE_ENV=production the auth cookie
        # is marked Secure, and browsers silently drop Secure cookies over
        # http:// - login then succeeds server-side but never persists.
        "NODE_ENV"               = "development"
        # Local runs are plain HTTP, so the cookie must NOT be Secure or the
        # browser drops it and login never persists. Set explicitly rather than
        # inherited from .env.example, which the API validates at boot.
        "COOKIE_SECURE"          = "false"
        "CORS_ORIGIN"            = "http://$Hostname"
    }

    # Rewrite in place, uncommenting keys that ship commented out.
    $lines = Get-Content $envPath
    $seen = @{}
    $out = foreach ($line in $lines) {
        $matched = $false
        foreach ($k in $map.Keys) {
            if ($line -match "^\s*#?\s*$([regex]::Escape($k))=") {
                $matched = $true
                if (-not $seen[$k]) { $seen[$k] = $true; "$k=$($map[$k])" }
                break
            }
        }
        if (-not $matched) { $line }
    }
    foreach ($k in $map.Keys) { if (-not $seen[$k]) { $out += "$k=$($map[$k])" } }
    $out | Set-Content $envPath -Encoding ASCII

    Ok "Generated .env with random secrets"
    Say "`n  This account signs in to BOTH http://$Hostname and http://admin.$Hostname" "Cyan"
    Say "    user:     $seedUser" "Cyan"
    Say "    email:    $seedEmail" "Cyan"
    Say "    password: $seedPassword" "Cyan"
    Say "  (stored in .env, which is gitignored)`n" "DarkGray"
}

# An existing Postgres volume keeps the password it was FIRST initialised with,
# so a regenerated .env produces credentials the database has never seen. That
# surfaces minutes later as "P1000: Authentication failed" from the migrate
# container, which reads like a config error rather than the stale-state problem
# it is.
#
# Postgres is started HERE rather than only checked if already running: on a
# fresh bootstrap nothing is up yet, so a check that requires a running
# container skips exactly when it is needed.
$pgVolume = docker volume ls --quiet --filter "name=postgres" 2>$null | Select-Object -First 1
if ($pgVolume) {
    Say "`nChecking the existing database..."
    docker compose --env-file $envPath -f $Compose up -d postgres *> $null

    $pgPass = (Select-String -Path $envPath -Pattern '^POSTGRES_PASSWORD=' |
        Select-Object -First 1).Line -replace '^POSTGRES_PASSWORD=', ''

    $authOk = $false
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 2
        docker compose --env-file $envPath -f $Compose exec -T -e PGPASSWORD=$pgPass `
            postgres psql -U postgres -c "SELECT 1" *> $null
        if ($LASTEXITCODE -eq 0) { $authOk = $true; break }
        # Distinguish "still starting" from "wrong password": pg_isready
        # succeeds once the server accepts connections at all.
        docker compose --env-file $envPath -f $Compose exec -T postgres pg_isready *> $null
        if ($LASTEXITCODE -eq 0) { break }
    }

    if (-not $authOk) {
        Warn "The existing Postgres volume was created with a different password."
        Say "  A database keeps the password it was first initialised with, so a" "Yellow"
        Say "  regenerated .env cannot authenticate against it." "Yellow"
        Say "" "Yellow"
        Say "  Wipe the database and start clean:" "Yellow"
        Say "    docker compose --env-file .env -f deployment/docker-compose.yml down -v" "Cyan"
        Say "" "Yellow"
        Say "  Or keep your data by restoring the .env that created it." "Yellow"
        exit 1
    }
    Ok "Existing database accepts the current credentials"
}

# Catch any placeholder that slipped through. These surface at runtime as an
# auth error that looks like a config problem, so fail loudly here instead.
$placeholders = Select-String -Path $envPath -Pattern 'change-me-to-a-random'
if ($placeholders) {
    Warn "These lines in .env still contain placeholder values:"
    foreach ($p in $placeholders) { Say "    $($p.LineNumber): $($p.Line)" "Yellow" }
    Fail "Replace them before starting, or delete .env and re-run to regenerate."
}

# -- Build ----------------------------------------------------
Say "`nInstalling dependencies (this takes a minute)..."
pnpm install
if ($LASTEXITCODE -ne 0) { Fail "pnpm install failed" }
Ok "Dependencies installed"

Say "`nGenerating Prisma client..."
Push-Location (Join-Path $RepoRoot "apps\api")
npx prisma generate
$prismaExit = $LASTEXITCODE
Pop-Location
if ($prismaExit -ne 0) { Fail "prisma generate failed" }
Ok "Prisma client generated"

Say "`nBuilding base image..."
docker build -f (Join-Path $RepoRoot "deployment\Dockerfile.base") -t aurorachess-base $RepoRoot
if ($LASTEXITCODE -ne 0) { Fail "base image build failed" }
Ok "Base image built"

Say "`nStarting services (first run builds five images - several minutes)..."
docker compose --env-file $envPath -f $Compose up -d --build
if ($LASTEXITCODE -ne 0) { Fail "docker compose up failed. Inspect with:`n    docker compose --env-file .env -f deployment/docker-compose.yml logs" }

# nginx resolves upstreams once at startup and caches the container IPs, so a
# rebuild leaves it proxying to addresses that no longer exist (502).
Say "`nRestarting nginx to pick up new upstreams..."
docker compose --env-file $envPath -f $Compose restart nginx | Out-Null

# -- Verify ---------------------------------------------------
Say "`nWaiting for services..."
$deadline = (Get-Date).AddMinutes(3)
$up = $false
while ((Get-Date) -lt $deadline) {
    try {
        $r = Invoke-WebRequest -Uri "http://$Hostname" -UseBasicParsing -TimeoutSec 5
        if ($r.StatusCode -eq 200) { $up = $true; break }
    } catch { Start-Sleep -Seconds 5 }
}

Say ""
if ($up) {
    Ok "Aurora Chess is up"
    Say "`n  Site:    http://$Hostname" "Cyan"
    Say "  Admin:   http://admin.$Hostname" "Cyan"
    Say "  Grafana: http://grafana.$Hostname" "Cyan"
    Say "`n  Logs:    docker compose --env-file .env -f deployment/docker-compose.yml logs -f" "DarkGray"
    Say "  Stop:    docker compose --env-file .env -f deployment/docker-compose.yml down`n" "DarkGray"
} else {
    Warn "Services started but http://$Hostname did not respond within 3 minutes."
    Say "  Check status:  docker compose --env-file .env -f deployment/docker-compose.yml ps -a" "Yellow"
    Say "  Check logs:    docker compose --env-file .env -f deployment/docker-compose.yml logs --tail=50" "Yellow"
}
