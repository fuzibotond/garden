#!/bin/sh
# Set defaults so envsubst always has values to substitute
export PORT="${PORT:-80}"
export BACKEND_URL="${BACKEND_URL}"

# Substitute only our variables to avoid clobbering nginx variables like $uri, $host, etc.
envsubst '${PORT} ${BACKEND_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
