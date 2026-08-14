#!/bin/sh
# ──────────────────────────────────────────────────────────
# Certbot init — gets initial cert then renews every 12h.
# Skips entirely if SITE_DOMAIN is not set.
#
# After renewal, touches /etc/letsencrypt/.renewed so the
# nginx-entrypoint watcher can reload nginx automatically.
# ──────────────────────────────────────────────────────────
set -e

if [ -z "$SITE_DOMAIN" ]; then
  echo "SITE_DOMAIN not set — skipping certbot (HTTP-only mode)"
  exit 0
fi

if [ -z "$CERTBOT_EMAIL" ]; then
  echo "ERROR: CERTBOT_EMAIL is required when SITE_DOMAIN is set"
  exit 1
fi

# Build domain list: CERTBOT_DOMAINS overrides, otherwise just SITE_DOMAIN
DOMAINS="${CERTBOT_DOMAINS:-$SITE_DOMAIN}"
DOMAIN_ARGS=""
for d in $DOMAINS; do
  DOMAIN_ARGS="$DOMAIN_ARGS -d $d"
done

# Wait for Nginx to be ready (serves ACME challenge on port 80)
echo "Waiting for Nginx..."
for i in $(seq 1 30); do
  if wget -qO- http://nginx:80/ > /dev/null 2>&1; then
    echo "Nginx is ready"
    break
  fi
  if [ "$i" = "30" ]; then
    echo "WARNING: Nginx not responding after 60s, attempting cert anyway"
  fi
  sleep 2
done

# Get initial cert if it doesn't exist
if [ ! -f "/etc/letsencrypt/live/$SITE_DOMAIN/fullchain.pem" ]; then
  echo "Requesting initial certificate for: $DOMAINS"
  certbot certonly \
    --webroot \
    -w /var/www/certbot \
    $DOMAIN_ARGS \
    --email "$CERTBOT_EMAIL" \
    --agree-tos \
    --non-interactive \
    --no-eff-email

  # Signal nginx to reload with new certs
  touch /etc/letsencrypt/.renewed

  echo ""
  echo "============================================"
  echo "Certificate obtained! Restart Nginx to enable HTTPS:"
  echo "  docker compose restart nginx"
  echo "============================================"
  echo ""
else
  echo "Certificate already exists for $SITE_DOMAIN"
fi

# Renewal loop — check every 12 hours
echo "Starting renewal loop..."
while true; do
  sleep 12h
  echo "Checking for certificate renewal..."
  certbot renew --quiet --deploy-hook "touch /etc/letsencrypt/.renewed"
done
