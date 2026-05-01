#!/bin/sh
# Set defaults so envsubst always has values to substitute
export PORT="${PORT:-80}"

# Default to the API's internal Railway hostname when BACKEND_URL is not set.
export BACKEND_URL="${BACKEND_URL:-http://garden-api.railway.internal:8080}"

# If BACKEND_URL ends with ':' (common when a referenced PORT var is empty),
# append the API's default container port to keep nginx config valid.
case "$BACKEND_URL" in
	*:)
		export BACKEND_URL="${BACKEND_URL}8080"
		;;
esac

# Substitute only our variables to avoid clobbering nginx variables like $uri, $host, etc.
envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
