# QA Environment Guide

The QA environment runs inside Kubernetes.

Deployment branch:

main

---

# Access QA API

Start port-forward:

kubectl port-forward service/garden-api 8080:8080 -n garden-qa

Open:

http://localhost:8080/swagger

---

# Health Check

GET /health

Expected response:

status: ok

---

# Authentication Tests

Test the full authentication flow.

1 Register gardener

POST /gardeners/register

2 Login

POST /gardeners/login

Expected:

JWT token returned

3 Access protected endpoint

Add header:

Authorization: Bearer <token>

4 Refresh token

POST /auth/refresh

5 Logout

POST /auth/logout

---

# Database Verification

Check database pod:

kubectl get pods -n garden-qa

Check SQL logs:

kubectl logs -l app=garden-sqlserver -n garden-qa

---

# API Logs

View API logs:

kubectl logs -l app=garden-api -n garden-qa

Look for:

Database migration completed

JWT key loaded: True
Connection string loaded: True

---

# Troubleshooting

Login fails with error:

IDX10720

Cause:

JWT key shorter than 32 characters.

Fix:

Update GitHub secret:

QA_JWT_KEY

Redeploy QA.