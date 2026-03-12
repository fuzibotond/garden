# 4. QA Testing Guide

Create:

```
docs/qa-testing-guide.md
```

Content:

```
# QA Environment Guide
```

QA environment runs inside Kubernetes.

Branch:

```
main
```

---

## Access QA API

Start port-forward:

```
kubectl port-forward service/garden-api 81:80 -n garden-qa
```

Open:

```
http://localhost:81/swagger
```

---

## Health check

```
GET /health
```

Expected:

```
status: ok
```

---

## Authentication tests

Test flow:

1 Register gardener
2 Login
3 Access profile
4 Update profile
5 Logout

---

## Viewing logs

API logs:

```
kubectl logs -l app=garden-api -n garden-qa
```

Database logs:

```
kubectl logs -l app=garden-sqlserver -n garden-qa
```

---

