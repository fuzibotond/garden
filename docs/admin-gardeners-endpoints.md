Below is a **clean, structured documentation** you can place directly in your frontend repository as `API.md` or `FRONTEND_API_GUIDE.md`.

It keeps your content but organizes it into proper developer documentation.

---

# Garden Platform

## Frontend + API Integration Guide

## 1. Overview

### Purpose

This document describes how the **frontend applications** interact with the **Garden Platform REST API**.

Frontend applications include:

* **Admin Web Application**
* **Gardener Mobile Application**

Both clients communicate with the backend using **REST APIs secured with JWT authentication**.

---

# 2. Authentication

All protected endpoints require a **JWT Bearer Token**.

### Request Header

```
Authorization: Bearer <token>
```

The token should be stored securely (e.g., `localStorage` or secure storage on mobile) and attached to every authenticated API request.

---

# 3. Roles

Two primary roles exist in the system:

| Role     | Description                                        |
| -------- | -------------------------------------------------- |
| Admin    | Full system access including gardeners and clients |
| Gardener | Can manage only their own clients                  |

### Frontend Responsibilities

The frontend should:

* Show/hide UI actions depending on role
* Redirect unauthorized users
* Still rely on backend authorization as the final check

---

# 4. Common API Rules

### Email Normalization

Before submitting emails to the API:

```javascript
email = email.trim().toLowerCase()
```

This avoids duplicate conflicts caused by casing differences.

---

# 5. HTTP Response Handling

Frontend applications should handle responses according to HTTP status codes.

| Status Code      | Meaning                               | Frontend Action                |
| ---------------- | ------------------------------------- | ------------------------------ |
| 200 OK           | Successful request with response body | Render returned data           |
| 201 Created      | Resource successfully created         | Show success message           |
| 204 No Content   | Successful update or deletion         | Refresh list / remove item     |
| 400 Bad Request  | Validation error                      | Show inline form validation    |
| 401 Unauthorized | Authentication missing/expired        | Redirect to login              |
| 403 Forbidden    | Insufficient permissions              | Show permission error          |
| 404 Not Found    | Resource does not exist               | Show error or redirect         |
| 409 Conflict     | Duplicate email or business conflict  | Show friendly conflict message |

---

# 6. API Endpoints

---

# 6.1 Gardener — Clients

Base route:

```
/api/gardener/clients
```

Authorization required: **Gardener**

---

## Get Clients

```
GET /api/gardener/clients?page=1&pageSize=20
```

### Query Parameters

| Parameter | Type | Description    |
| --------- | ---- | -------------- |
| page      | int  | Page number    |
| pageSize  | int  | Items per page |

### Response

```
200 OK
{
  items: [GardenerClientDto],
  total: number,
  page: number,
  pageSize: number
}
```

---

## Get Client by ID

```
GET /api/gardener/clients/{id}
```

### Response

```
200 OK
{
  clientId,
  fullName,
  email,
  createdAt
}
```

or

```
404 Not Found
```

---

## Create Client

```
POST /api/gardener/clients
```

### Request Body

```json
{
  "email": "string",
  "fullName": "string",
  "password": "string (optional)"
}
```

### Responses

**Success**

```
201 Created
```

Returns created client DTO.

**Validation error**

```
400 Bad Request
```

**Duplicate email**

```
409 Conflict
{
  "message": "A client with this email already exists."
}
```

---

## Update Client

```
PUT /api/gardener/clients/{id}
```

### Request Body

```json
{
  "fullName": "string",
  "email": "string"
}
```

### Responses

```
204 No Content
```

Possible errors:

| Status | Cause            |
| ------ | ---------------- |
| 400    | Validation error |
| 404    | Client not found |
| 409    | Duplicate email  |

---

## Delete Client

```
DELETE /api/gardener/clients/{id}
```

### Responses

```
204 No Content
```

or

```
404 Not Found
```

---

# 6.2 Admin — Clients

Base route:

```
/api/admin/clients
```

Authorization required: **Admin**

Endpoints are identical to **Gardener Clients**, but allow administrators to manage **all clients in the system**.

---

## Admin Client Endpoints

```
GET /api/admin/clients
GET /api/admin/clients/{id}
POST /api/admin/clients
PUT /api/admin/clients/{id}
DELETE /api/admin/clients/{id}
```

### Duplicate Email Errors

Creation:

```
409 Conflict
```

Update:

```
409 Conflict
{
  "message": "A client with this email already exists."
}
```

---

# 6.3 Admin — Gardeners

Base route:

```
/api/admin/gardeners
```

Authorization required: **Admin**

---

## Get Gardeners

```
GET /api/admin/gardeners?page=1&pageSize=20
```

Returns paginated list of gardeners.

---

## Get Gardener by ID

```
GET /api/admin/gardeners/{id}
```

Returns gardener details.

---

## Create Gardener

```
POST /api/admin/gardeners
```

### Request Body

```json
{
  "email": "string",
  "password": "string",
  "companyName": "string",
  "contactName": "string"
}
```

### Responses

```
201 Created
```

Possible errors:

```
400 Bad Request
409 Conflict
```

---

## Update Gardener

```
PUT /api/admin/gardeners/{id}
```

### Request Body

```json
{
  "companyName": "string",
  "contactName": "string",
  "email": "string"
}
```

### Responses

```
204 No Content
```

Duplicate email:

```
409 Conflict
{
  "message": "Email already in use."
}
```

---

## Delete Gardener

```
DELETE /api/admin/gardeners/{id}
```

### Responses

```
204 No Content
```

or

```
404 Not Found
```

---

# 7. Data Transfer Objects (DTOs)

### CreateClientRequest

```ts
{
  email: string
  fullName: string
  password?: string
}
```

---

### UpdateClientRequest

```ts
{
  fullName?: string
  email?: string
}
```

Defined in:

```
Garden.Api.Dto.SharedRequests.cs
```

---

### Response DTOs

| DTO               | Description                     |
| ----------------- | ------------------------------- |
| GardenerClientDto | Client information for gardener |
| AdminClientDto    | Client information for admin    |
| AdminGardenerDto  | Gardener profile data           |

Frontend should use fields returned by controllers.

---

# 8. Error Messages

Frontend should map server errors to UI messages.

| Server Message                          | UI Handling                  |
| --------------------------------------- | ---------------------------- |
| Email and fullName are required         | Show form validation         |
| A client with this email already exists | Show duplicate email message |
| Email already in use                    | Show conflict warning        |

Service-level `ArgumentException` errors are returned as **400 Bad Request**.

---

# 9. Frontend Implementation Recommendations

### Email Handling

Always normalize emails before submitting:

```javascript
email = email.trim().toLowerCase()
```

---

### Centralized API Client

Create a shared API client that:

* attaches Authorization header
* maps API errors to structured objects
* handles token expiration

---

### Error Display

| Status | UI Behavior                 |
| ------ | --------------------------- |
| 400    | Inline form validation      |
| 409    | Toast notification or modal |
| 401    | Redirect to login           |
| 403    | Permission message          |

---

### Testing

Frontend should include unit tests for:

* mapping API errors to UI messages
* form validation
* API client error handling

---

# 10. Recommended Next Steps

You may also want to add:

* **TypeScript API client stubs**
* **typed request/response interfaces**
* **React Query hooks for each endpoint**

Example:

```
useGardeners()
useClients()
createClient()
updateClient()
```

---

