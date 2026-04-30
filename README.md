# Garden

Monorepo for the Gardener App learning platform.

## Local Launch Environment

Prerequisites:

- Docker Desktop
- .NET SDK 10
- Node.js 20+
- PowerShell 5.1+

Environment templates:

- Copy `.env.example` to `.env` for shared local defaults.
- Copy `.env.local.example` to `.env.local` for developer-specific overrides.

Start the full local stack:

```powershell
.\scripts\launch-local.ps1
```

Start the stack and the Expo host in a second PowerShell window:

```powershell
.\scripts\launch-local.ps1 -StartMobile
```

Useful local commands:

```powershell
.\scripts\check-health.ps1
.\scripts\run-smoke-tests.ps1
.\scripts\show-logs.ps1 -Follow
.\scripts\run-all-tests.ps1
.\scripts\stop-local.ps1
.\scripts\restart-local.ps1
```

Default local URLs:

- API: http://localhost:5055
- Swagger: http://localhost:5055/swagger
- Health: http://localhost:5055/health/live and http://localhost:5055/health/ready
- Metrics: http://localhost:5055/metrics
- Web: http://localhost:8082
- RabbitMQ management: http://localhost:15672
- MailHog: http://localhost:8025
- Dozzle logs: http://localhost:9999

Common issue:

- If the launcher reports a port conflict, stop any older repo-local Compose stack or any host process already listening on `5055`, `8082`, `1433`, `5672`, `15672`, `1025`, `8025`, or `9999`.

See `docs/developer-setup.md` for the detailed workflow.