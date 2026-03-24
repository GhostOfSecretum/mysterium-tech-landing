#!/usr/bin/env bash
set -euo pipefail

DOMAIN="mysteriumtech.ru"
EMAIL="akhatov6@gmail.com"

echo "=== Mysterium Tech — Deploy Script ==="
echo ""

# ─── Step 1: Build the site image ───
echo "[1/4] Building Docker image..."
docker compose build web

# ─── Step 2: Start Nginx with HTTP-only config (for cert issuance) ───
echo "[2/4] Starting Nginx with initial HTTP config..."
cp nginx/init.conf nginx/active.conf
docker compose up -d web

echo "Waiting for Nginx to start..."
sleep 5

# ─── Step 3: Obtain Let's Encrypt certificate ───
echo "[3/4] Requesting SSL certificate from Let's Encrypt..."
docker compose run --rm --entrypoint "" certbot \
    certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    -d "$DOMAIN" \
    -d "www.$DOMAIN"

# ─── Step 4: Switch to HTTPS config and restart ───
echo "[4/4] Switching to HTTPS config and restarting..."
cp nginx/default.conf nginx/active.conf
docker compose restart web

echo ""
echo "=== Done! ==="
echo "Your site is live at https://$DOMAIN"
echo ""
echo "Certbot will auto-renew certificates in the background."
echo "To manually renew: docker compose run --rm certbot renew && docker compose restart web"
