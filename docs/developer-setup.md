# Developer Environment Setup

This guide explains how developers run the Garden platform locally.

The development environment is isolated from QA.

DEV API: http://localhost:80  
QA API: http://localhost:81

DEV uses database: GardenDevDb
QA uses database: GardenQaDb

---

## Step 1 Install prerequisites

Install:

* Git
* .NET SDK 10
* Docker Desktop
* kubectl
* Visual Studio or VS Code

Verify:

```
git --version
dotnet --version
docker version
kubectl version
```

---

## Step 2 Clone repository

```
git clone <repo>
cd garden
git checkout develop
```

Explanation:

Developers work on `develop`.
`main` is reserved for QA deployments.

---

## Step 3 Setup environment variables

```
cp .env.template .env.local
```

Edit `.env.local`.

These values are **never committed**.

---

## Step 4 Start local SQL Server

```
docker run \
-p 1433:1433 \
-e ACCEPT_EULA=Y \
-e MSSQL_SA_PASSWORD=<password> \
-d mcr.microsoft.com/mssql/server:2022-latest
```

Docker is used so developers don't need SQL Server installed.

---

## Step 5 Run migrations

```
dotnet ef database update
```

Creates the development schema.

---

## Step 6 Run API

```
dotnet run --urls=http://localhost:80
```

Open:

```
http://localhost:80/swagger
```

---

## Step 7 Development workflow

Create feature branch:

```
git checkout develop
git pull
git checkout -b feature/my-feature
```

Push:

```
git push origin feature/my-feature
```

Create PR → `develop`.

---

# 4. QA Testing Guide

Create:

```
docs/qa-testing-guide.md
```
---