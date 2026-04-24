# Postman Collection Update Summary

## Overview
Updated `GardenApp_Postman_Collection.json` with missing endpoints from recent bug fixes and feature implementations.

---

## Changes Made

### 1. Added "Update Client" Endpoint

**Location:** `Gardener - Clients` section

**Endpoint Details:**
- **Method:** `PUT`
- **Path:** `/api/gardener/clients/{client_id}`
- **Authorization:** Bearer token (Gardener role required)
- **Request Body:**
  ```json
  {
    "fullName": "Updated Client Name",
    "email": "updated@example.com"
  }
  ```

**Description:** 
Update client information. Gardener must have access to the client via job or invitation relationship. Email must be unique.

**Responses:**
- `204 No Content` - Success
- `401 Unauthorized` - User not authenticated or lacks access
- `404 Not Found` - Client doesn't exist
- `409 Conflict` - Email already exists

---

### 2. Enhanced "Update My Profile" Endpoint

**Location:** `Authentication` section

**Improvements:**
- ✅ Updated request body to show both Client and Gardener fields
- ✅ Added descriptive documentation
- ✅ Clarified field usage for different roles

**Updated Request Body:**
```json
{
  "name": "Updated Name",
  "companyName": "Updated Company Name"
}
```

**Description Added:**
> Update current user profile. For Client: only 'name' field is used. For Gardener: both 'name' and 'companyName' fields can be updated.

**Note:** The endpoint path was already correct (`/auth/profile`) from previous updates.

---

### 3. Updated Collection Description

**Before:**
> Complete API collection for Garden App - Gardener Service Platform. Updated with task-material assignment support (multiple materials per task with usedQuantity) and material cost fields in task responses.

**After:**
> Complete API collection for Garden App - Gardener Service Platform. Updated with task-material assignment support (multiple materials per task with usedQuantity), material cost fields in task responses, profile update endpoints, and gardener client management.

---

## Complete "Gardener - Clients" Section Endpoints

Now includes:

1. ✅ **GET** `/api/gardener/clients` - Get all clients (paginated)
2. ✅ **GET** `/api/gardener/clients/{id}` - Get client by ID
3. ✅ **GET** `/api/gardener/clients/total` - Get total clients count
4. ✅ **PUT** `/api/gardener/clients/{id}` - **[NEW]** Update client
5. ✅ **POST** `/api/gardener/clients/invitations` - Invite client
6. ✅ **GET** `/api/gardener/clients/invitations/{id}` - Get invitation by ID
7. ✅ **GET** `/api/gardener/clients/invitations/validate-token` - Validate invitation token
8. ✅ **POST** `/api/gardener/clients/invitations/accept` - Accept invitation

---

## Complete "Authentication" Section Endpoints

Now includes:

1. ✅ **POST** `/auth/login` - Login
2. ✅ **POST** `/auth/register/gardener` - Register gardener
3. ✅ **POST** `/auth/register/client` - Register client
4. ✅ **POST** `/auth/logout` - Logout
5. ✅ **GET** `/auth/profile` - Get my profile
6. ✅ **PUT** `/auth/profile` - **[ENHANCED]** Update my profile
7. ✅ **DELETE** `/auth/profile` - Delete my profile

---

## Testing with Postman

### Variables Required

Make sure you have these environment variables set:

- `base_url` - Base URL of the API (e.g., `http://localhost:5055`)
- `access_token` - JWT token from login
- `client_id` - GUID of a client
- `gardener_id` - GUID of a gardener
- `invitation_id` - GUID of an invitation
- `invitation_token` - Token string from invitation

### Test Sequence for Update Client

1. **Login as Gardener**
   ```
   POST /auth/login
   ```
   - Save the `access_token` from response

2. **Get Your Clients**
   ```
   GET /api/gardener/clients
   ```
   - Copy a `clientId` from the response
   - Save it as `{{client_id}}`

3. **Update Client**
   ```
   PUT /api/gardener/clients/{{client_id}}
   ```
   - Modify `fullName` and/or `email` in request body
   - Should return `204 No Content`

4. **Verify Update**
   ```
   GET /api/gardener/clients/{{client_id}}
   ```
   - Check that the client details are updated

### Test Sequence for Update Profile

1. **Login** (as Client or Gardener)
   ```
   POST /auth/login
   ```

2. **Get Current Profile**
   ```
   GET /auth/profile
   ```

3. **Update Profile**
   ```
   PUT /auth/profile
   ```
   - For Client: Update `name` only
   - For Gardener: Update `name` and/or `companyName`

4. **Verify Update**
   ```
   GET /auth/profile
   ```

---

## Authorization Notes

### Update Client Endpoint
- **Required Role:** Gardener
- **Access Control:** Gardener must have access to the client through:
  - Job relationship (gardener assigned to a job with that client), OR
  - Invitation relationship (gardener sent invitation to that client's email)

### Update Profile Endpoint
- **Required:** Authenticated user (Client or Gardener)
- **Access Control:** User can only update their own profile
- **Token Validation:** Token must not be issued before last logout

---

## Files Modified

- ✅ `GardenApp_Postman_Collection.json`
  - Added "Update Client" endpoint
  - Enhanced "Update My Profile" endpoint with better documentation
  - Updated collection description

---

## Related Documentation

- API implementation: `BUG_FIXES_SUMMARY.md`
- Test coverage: `NEW_TESTS_SUMMARY.md`
- Quick reference: `QUICK_REFERENCE.md`

---

**Last Updated:** 2025-01-16
**Collection Version:** Updated for Garden App v1.0
**Status:** ✅ Ready for use
