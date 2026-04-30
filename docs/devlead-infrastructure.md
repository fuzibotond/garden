# Infrastructure Overview

Garden uses a CI/CD pipeline with Kubernetes.

For local development, the canonical environment is the root `docker-compose.yml` plus the PowerShell scripts in `scripts/`.

Architecture:

GitHub
│
├─ develop → CI pipeline
│
└─ main → QA deployment
      │
      ▼
Self-hosted runner
      │
      ▼
Docker build
      │
      ▼
Kubernetes deployment

---

# Kubernetes Architecture

Namespace:

garden-qa

Resources:

deployment
service
secret
configmap
persistent volume claim

Pods:

garden-api
garden-sqlserver

---

# Local Launch Stack

Local development stays on Docker Compose and does not require Kubernetes.

Local services:

- sqlserver
- rabbitmq
- mailhog
- api
- web
- dozzle

Local observability:

- API health endpoints: `/health/live`, `/health/ready`
- API metrics endpoint: `/metrics`
- JSON console logs with correlation IDs
- RabbitMQ management UI
- Dozzle container log viewer

The root launcher scripts provide:

- one-command startup and shutdown
- health/status snapshots
- smoke checks
- combined test execution

---

# CI Pipeline

Triggered on:

develop
pull requests

Steps:

restore
build
test
docker build

CI validates code but does not deploy.

---

# CD Pipeline

Triggered on:

main

Deployment flow:

GitHub Action
↓
Build Docker image
↓
Create/update Kubernetes secrets
↓
kubectl apply -k deploy/k8s/overlays/qa
↓
rollout restart deployment

---

# Secret Management

Secrets are **never stored in Git**.

Secrets exist in three places:

Local development

.env.local

CI/CD

GitHub Actions Secrets

Runtime

Kubernetes Secrets

---

# GitHub Secrets

Repository → Settings → Secrets → Actions

Example secrets:

QA_JWT_KEY
QA_SQL_CONNECTION
QA_SQL_PASSWORD

These are injected during deployment.

---

# Kubernetes Secrets

Secret created during deployment:

garden-secrets

Example keys:

Jwt__Key
ConnectionStrings__GardenDb
MSSQL_SA_PASSWORD

The API reads secrets using environment variables.

---

# Storage

SQL Server uses persistent storage.

PersistentVolumeClaim:

sqlserver-pvc

Data path:

/var/opt/mssql

This prevents database data loss when pods restart.

Local Docker Compose also uses persistent volumes for SQL Server and RabbitMQ.

---

# Recreating QA Environment

Requirements:

Docker Desktop
kubectl

Deploy QA:

kubectl apply -k deploy/k8s/overlays/qa

Verify:

kubectl get pods -n garden-qa
kubectl get pvc -n garden-qa