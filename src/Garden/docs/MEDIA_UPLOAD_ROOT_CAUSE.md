# Task Questions Media Upload - Root Cause Analysis

## Problem

Media upload for task questions was failing with:
```
Microsoft.Data.SqlClient.SqlException: String or binary data would be truncated in table 'GardenDb.dbo.TaskQuestionMedia', column 'MediaUrl'.
Truncated value: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAFxYAAAvCCAYAAADI0bewAAAQAElEQVR4AezcO5Ycx7VA0V6chQwZmv'
```

## Root Cause

**Architectural Mismatch**: The system expected file URLs but received base64-encoded image data.

### The Issue
- **Database**: `MediaUrl` column limited to 2048 characters (designed for URLs)
- **Client**: Sending base64-encoded images (50,000-650,000+ characters)
- **Missing**: No file storage mechanism to convert base64 → URL

### Why It Failed
```
Base64 Image Size:
- 50KB image  = ~67,000 characters (33x too large)
- 200KB image = ~270,000 characters (132x too large)
- 500KB image = ~670,000 characters (327x too large)

Database Column:
- Max: 2,048 characters
- Result: Data truncation error ❌
```

## Solution

Implemented **file storage abstraction** with two implementations:

### 1. Development: LocalFileStorageService
- Saves base64 data to `wwwroot/uploads/`
- Returns local URL: `http://localhost:5000/uploads/question-media/{guid}_{filename}`

### 2. Production: AzureBlobStorageService  
- Uploads to Azure Blob Storage
- Returns blob URL: `https://account.blob.core.windows.net/question-media/{guid}_{filename}`

### Flow
```
BEFORE (Broken):
Client → Base64 (500KB) → API → Database (2048 char limit) ❌

AFTER (Fixed):
Client → Base64 → Storage Service → URL → Database (< 200 chars) ✅
                  ├─ Dev: wwwroot/uploads/
                  └─ Prod: Azure Blob Storage
```

## Files Changed

### Created
- `Garden.BuildingBlocks/Services/IBlobStorageService.cs`
- `Garden.BuildingBlocks/Services/AzureBlobStorageService.cs`
- `Garden.BuildingBlocks/Services/LocalFileStorageService.cs`
- `docs/MEDIA_UPLOAD_FIX.md` (detailed documentation)

### Modified
- `Garden.Modules.Tasks/Features/Questions/UploadQuestionMediaHandler.cs`
- `Garden.Modules.Tasks/Features/Questions/UploadAnswerMediaHandler.cs`
- `Garden.Api/Program.cs` (service registration)
- `Garden.Api/appsettings.json` (configuration)

### No Changes
- ✅ Database schema (no migration needed)
- ✅ API contracts (DTOs unchanged)
- ✅ Client code (continues sending base64)

## Configuration

### Development (Default)
No configuration needed - uses local file storage automatically.

### Production
Add Azure Blob Storage connection string:
```json
{
  "Azure": {
    "BlobStorage": {
      "ConnectionString": "your-azure-storage-connection-string"
    }
  }
}
```

## Impact

- ✅ **No breaking changes** for existing functionality
- ✅ **No database migration** required
- ✅ **No client changes** required
- ✅ **Works in dev** without Azure account
- ✅ **Production-ready** with Azure Blob Storage

## References

See `docs/MEDIA_UPLOAD_FIX.md` for:
- Detailed implementation
- Configuration guide
- Testing procedures
- Security considerations
- Future improvements
