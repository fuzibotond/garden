# Developer Environment Setup

This guide explains how developers run the Garden platform locally.

The development environment is completely isolated from QA and now uses one root launcher for the whole local stack.

DEV API: http://localhost:5055  
QA API: http://localhost:8080 (via port-forward)

DEV database: Docker SQL Server

---

# 1. Install prerequisites

Install:

- Git
- .NET SDK 10
- Docker Desktop
- Node.js 20+
- PowerShell 5.1+
- Visual Studio or VS Code

Verify installation:

git --version  
dotnet --version  
docker version  
node --version

---

# 2. Clone repository

git clone <repo>
cd garden
git checkout develop

Developers work on `develop`.

`main` is reserved for QA deployments.

---

# 3. Configure local environment files

Copy the root templates:

```powershell
Copy-Item .env.example .env
Copy-Item .env.local.example .env.local
```

Edit `.env.local` only when you need overrides.

Important:

- `.env.local` **must never be committed**
- The root scripts prefer `.env.local` over `.env`
- `src/Garden/Garden.Api/.env.local` remains optional when you run the API outside Docker

---

# 4. Start the full local stack

```powershell
.\scripts\launch-local.ps1
```

This starts:

- SQL Server
- RabbitMQ with management UI
- MailHog for SMTP capture
- ASP.NET Core API
- React web app
- Dozzle log viewer

To also start Expo in a second PowerShell window:

```powershell
.\scripts\launch-local.ps1 -StartMobile
```

---

# 5. Service URLs

- API: http://localhost:5055
- Swagger: http://localhost:5055/swagger
- API health: http://localhost:5055/health/live
- API readiness: http://localhost:5055/health/ready
- API metrics: http://localhost:5055/metrics
- Web: http://localhost:8082
- RabbitMQ: http://localhost:15672
- MailHog: http://localhost:8025
- Dozzle: http://localhost:9999

---

# 6. Check what is working

```powershell
.\scripts\check-health.ps1
.\scripts\run-smoke-tests.ps1
```

The health script shows:

- service URL
- current state
- current health
- worker status
- last test status
- last smoke-test status

---

# 7. Stop, restart, and inspect logs

```powershell
.\scripts\stop-local.ps1
.\scripts\restart-local.ps1
.\scripts\show-logs.ps1 -Follow
```

---

# 8. Run tests

```powershell
.\scripts\run-all-tests.ps1
```

This runs backend, web, and mobile tests and stores the last test result for the status script.

---

# 9. Important development notes

JWT keys must be **at least 32 characters**.

Short keys will break token generation.

Example error:

IDX10720: key size must be greater than 256 bits

Common local problem:

- A locally running `Garden.Api` on port `5055` will shadow the container and make health checks fail. Stop it before using the root launcher.