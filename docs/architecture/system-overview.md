# System Overview

Garden is a modular monolith with a Docker Compose based local launch environment.

## Local Runtime Topology

- `sqlserver` stores application data with a persistent Docker volume.
- `rabbitmq` carries async events and exposes the management UI locally.
- `mailhog` captures SMTP traffic for notification development.
- `api` hosts the ASP.NET Core application and the embedded notification consumers.
- `web` hosts the React admin/browser application.
- `dozzle` provides container log viewing for the local stack.
- `mobile-app` remains a host-launched Expo process because that is more reliable than running Expo inside Docker for local development.

## Local Observability

- `GET /health/live` checks process liveness.
- `GET /health/ready` checks SQL Server and RabbitMQ reachability.
- `GET /metrics` exposes Prometheus-format metrics.
- Every API response includes `X-Correlation-ID`.
- The root health script writes a status snapshot to `artifacts/local-launch/health-status.json`.
