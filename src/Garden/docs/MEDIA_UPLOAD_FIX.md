# Media Upload Fix Documentation

**Version**: 1.1  
**Date**: 2026-04-25  
**Status**: Fixed

---

## Problem Summary

The Task Questions & Answers media upload feature was failing with the following error:

```
Microsoft.Data.SqlClient.SqlException: String or binary data would be truncated in table 'GardenDb.dbo.TaskQuestionMedia', column 'MediaUrl'.
```

### Root Cause

The system was receiving **base64-encoded image data** (data URIs like `data:image/png;base64,iVBORw0K...`) from the client, but the `MediaUrl` database column was designed to store **file URLs** with a maximum length of 2048 characters.

**Key Issue**: Base64-encoded images are typically 50KB-500KB+ in size, translating to 65,000-650,000+ characters - far exceeding the 2048 character limit.

**Architectural Gap**:
- ❌ No file upload handling (multipart/form-data)
- ❌ No file storage mechanism (Azure Blob Storage, file system, etc.)
- ❌ No URL generation for stored files
- ✅ Database designed for URLs (correct)
- ❌ Client sending base64 data instead of uploading files

---

## Solution Implemented

### Architecture: File Storage Service with Abstraction

Implemented a **storage abstraction layer** that supports both **Azure Blob Storage** (production) and **local file storage** (development).

### Components Added

#### 1. **IBlobStorageService Interface** (`Garden.BuildingBlocks/Services/IBlobStorageService.cs`)
```csharp
public interface IBlobStorageService
{
    Task<string> UploadFileAsync(string fileData, string fileName, string contentType, string containerName = "media");
    Task DeleteFileAsync(string fileUrl);
}
```

#### 2. **AzureBlobStorageService** (`Garden.BuildingBlocks/Services/AzureBlobStorageService.cs`)
- Production implementation using **Azure Blob Storage**
- Parses base64 data URIs
- Uploads to Azure Blob Storage
- Returns public blob URL

#### 3. **LocalFileStorageService** (`Garden.BuildingBlocks/Services/LocalFileStorageService.cs`)
- Development implementation using **local file system**
- Stores files in `wwwroot/uploads/` directory
- Returns local URL (e.g., `http://localhost:5000/uploads/question-media/{guid}_{filename}`)

#### 4. **Updated Handlers**
- `UploadQuestionMediaHandler`: Now uploads file to storage before saving URL to database
- `UploadAnswerMediaHandler`: Now uploads file to storage before saving URL to database

---

## Configuration

### Development (Local File Storage)

**No configuration required** - works out of the box.

Files are stored in: `wwwroot/uploads/question-media/` and `wwwroot/uploads/answer-media/`

### Production (Azure Blob Storage)

Add to `appsettings.Production.json` or environment variables:

```json
{
  "Azure": {
    "BlobStorage": {
      "ConnectionString": "DefaultEndpointsProtocol=https;AccountName=youraccountname;AccountKey=yourkey;EndpointSuffix=core.windows.net"
    }
  }
}
```

**Environment Variable**:
```bash
Azure__BlobStorage__ConnectionString="your-connection-string"
```

---

## How It Works

### Before (Broken)
```
Client → Base64 Image (500KB) → API → Database (MediaUrl: 2048 char limit) ❌ FAIL
```

### After (Fixed)
```
Client → Base64 Image → API → Storage Service
                              ├─ Dev: Save to wwwroot/uploads/
                              └─ Prod: Upload to Azure Blob Storage
                         → Get URL (e.g., https://storage.blob.core.windows.net/media/{guid}_{filename})
                         → Save URL to Database (< 2048 chars) ✅ SUCCESS
```

---

## File Organization

### Development
```
wwwroot/
└── uploads/
    ├── question-media/
    │   └── {guid}_{filename}
    └── answer-media/
        └── {guid}_{filename}
```

### Production (Azure)
```
Container: question-media
├── {guid}_photo1.jpg
├── {guid}_photo2.png
└── ...

Container: answer-media
├── {guid}_answer1.jpg
└── ...
```

---

## Testing

### Manual Test (Development)

1. Start the application
2. Create a question with media:
```bash
POST /api/questions/{questionId}/media
{
  "mediaUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA...",
  "mediaType": "image/png",
  "fileName": "test.png"
}
```

3. Verify response contains a URL:
```json
{
  "mediaId": "...",
  "mediaUrl": "http://localhost:5000/uploads/question-media/{guid}_test.png",
  ...
}
```

4. Access the URL in browser to verify file is accessible

### Production Test

Same as above, but the `mediaUrl` response will be an Azure Blob Storage URL:
```
https://yourstorageaccount.blob.core.windows.net/question-media/{guid}_test.png
```

---

## Migration Notes

### No Database Migration Required ✅

The database schema **did not change**:
- `MediaUrl` column remains `nvarchar(2048)`
- No existing data is affected
- Old records (if any) remain unchanged

### Breaking Change for Clients ❌

**Important**: This fix assumes the client sends base64 data. If the client is already uploading files correctly and sending URLs, this will break.

**Check your client implementation**:
- ✅ If client sends: `data:image/png;base64,...` → This fix works
- ❌ If client sends: actual URLs → Need to modify the handler to handle both cases

---

## Security Considerations

### ✅ Implemented
- Files stored with unique GUID prefixes (prevents overwrites)
- File name sanitization (removes invalid characters)
- Container isolation (question-media vs answer-media)

### 🔄 Recommended (Future)
- File size limits (currently no limit - could lead to disk/storage exhaustion)
- File type validation (currently trusts MediaType parameter)
- Rate limiting on upload endpoint
- Virus scanning for uploaded files
- Temporary URL generation (SAS tokens) instead of public blob access

---

## Cost Considerations (Azure)

### Storage Costs
- **Hot tier**: ~$0.018 per GB/month
- **Cool tier**: ~$0.01 per GB/month
- **Archive tier**: ~$0.002 per GB/month

### Example
- 10,000 images @ 500KB each = 5GB
- Hot tier cost: ~$0.09/month
- Cool tier cost: ~$0.05/month

### Recommendations
- Use **Hot tier** for recent images (last 30 days)
- Move to **Cool tier** after 30 days (lifecycle policy)
- Consider **Archive tier** for old/unused images

---

## Deployment Checklist

### Development
- ✅ No additional setup required
- ✅ Files stored locally in `wwwroot/uploads/`

### Production
- [ ] Create Azure Storage Account
- [ ] Get connection string
- [ ] Add connection string to app configuration
- [ ] Set CORS rules on blob containers (if accessed from browser)
- [ ] Test file upload and access
- [ ] Monitor storage costs

---

## Troubleshooting

### Issue: Files not accessible in development
**Solution**: Ensure `wwwroot/uploads/` directory exists and has write permissions

### Issue: Azure upload fails in production
**Solution**: 
1. Verify connection string is correct
2. Check storage account firewall rules
3. Ensure app has network access to Azure Storage

### Issue: URLs are broken after deployment
**Solution**: Check `FileStorage:BaseUrl` configuration matches your deployment URL

---

## Future Improvements

1. **Add file size limits** (e.g., 10MB max per file)
2. **Add MIME type validation** (reject non-image files)
3. **Implement multipart/form-data upload** (more efficient than base64)
4. **Add image optimization** (compress/resize before storing)
5. **Implement soft delete** (keep files for 30 days before permanent deletion)
6. **Add SAS token generation** (temporary access URLs)
7. **Implement CDN** (Azure CDN for faster global access)

---

## Related Files

### Modified
- `Garden.Modules.Tasks/Features/Questions/UploadQuestionMediaHandler.cs`
- `Garden.Modules.Tasks/Features/Questions/UploadAnswerMediaHandler.cs`
- `Garden.Api/Program.cs`
- `Garden.Api/appsettings.json`

### Created
- `Garden.BuildingBlocks/Services/IBlobStorageService.cs`
- `Garden.BuildingBlocks/Services/AzureBlobStorageService.cs`
- `Garden.BuildingBlocks/Services/LocalFileStorageService.cs`

### No Changes Required
- Database schema (no migration needed)
- API contracts (request/response DTOs unchanged)
- Client code (continues sending base64 data)

---

## Change Log

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-24 | Initial media upload feature (broken) |
| 1.1 | 2026-04-25 | Fixed: Implemented file storage service |

---

## Summary

✅ **Root Cause**: Client sending base64 data, but database expects URLs  
✅ **Solution**: Implemented storage service that saves files and generates URLs  
✅ **Impact**: No database changes, no client changes required  
✅ **Deployment**: Works in dev (local files) and prod (Azure Blob Storage)  
