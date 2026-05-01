#!/bin/sh
# Default to the API's internal Railway hostname when BACKEND_URL is not set.
export BACKEND_URL="${BACKEND_URL:-http://garden-api.railway.internal:8080}"

# If BACKEND_URL ends with ':' (PORT ref was empty), append default port.
case "$BACKEND_URL" in
  *:) export BACKEND_URL="${BACKEND_URL}8080" ;;
esac

# Substitute only BACKEND_URL — port 80 is hardcoded in nginx config.
envsubst '${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
