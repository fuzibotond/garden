# 5. Dev Lead Infrastructure Guide

Create:

```
docs/devlead-infrastructure.md
```

Content:

```
# Infrastructure Overview
```

---

## Architecture

```
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
        Kubernetes
          ├─ garden-api
          └─ sqlserver
```

---

## CI Pipeline

Triggered on:

```
develop
pull requests
```

Steps:

```
restore
build
test
docker build
```

---

## CD Pipeline

Triggered on:

```
main
```

Deployment flow:

```
GitHub Action
↓
Self-hosted runner
↓
kubectl apply
↓
rollout restart
```

---

## Kubernetes resources

Namespace:

```
garden-qa
```

Resources:

```
deployment
service
secret
configmap
```

---

## Recreating QA environment

Install:

```
Docker Desktop
kubectl
```

Deploy:

```
kubectl apply -k deploy/k8s/overlays/qa
```

Verify:

```
kubectl get pods -n garden-qa
```

---

# 6. Security Documentation

Create:

```
docs/security-secrets.md
```

Content:

```
# Secret Management
```

Secrets must never be stored in Git.

Secrets are stored in:

```
.env.local
GitHub Secrets
Kubernetes Secrets
```

---

## GitHub Secrets

Location:

```
Repository → Settings → Secrets → Actions
```

Examples:

```
JWT_KEY
SQL_PASSWORD
```

---

## Kubernetes Secrets

Create secret:

```
kubectl create secret generic garden-secrets \
-n garden-qa \
--from-literal=Jwt__Key=<value> \
--from-literal=Sql__SaPassword=<value>
```

---

# 7. Final Documentation Structure

Your repo should contain:

```
docs/
│
├─ developer-setup.md
├─ qa-testing-guide.md
├─ devlead-infrastructure.md
└─ security-secrets.md
```

Plus:

```
.env.template
deploy/k8s/secret.template.yaml
```

---



