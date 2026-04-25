using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace Garden.BuildingBlocks.Services;

public class AzureBlobStorageService : IBlobStorageService
{
    private readonly BlobServiceClient _blobServiceClient;

    public AzureBlobStorageService(BlobServiceClient blobServiceClient)
    {
        _blobServiceClient = blobServiceClient;
    }

    public async Task<string> UploadFileAsync(string fileData, string fileName, string contentType, string containerName = "media")
    {
        // Get or create container
        var containerClient = _blobServiceClient.GetBlobContainerClient(containerName);
        await containerClient.CreateIfNotExistsAsync(PublicAccessType.Blob);

        // Parse base64 data (remove data URI prefix if present)
        var base64Data = fileData;
        if (fileData.Contains("base64,"))
        {
            base64Data = fileData.Split("base64,")[1];
        }

        var fileBytes = Convert.FromBase64String(base64Data);

        // Generate unique blob name
        var blobName = $"{Guid.NewGuid()}_{SanitizeFileName(fileName)}";
        var blobClient = containerClient.GetBlobClient(blobName);

        // Upload with content type
        var blobHttpHeaders = new BlobHttpHeaders { ContentType = contentType };
        
        using var stream = new MemoryStream(fileBytes);
        await blobClient.UploadAsync(stream, new BlobUploadOptions
        {
            HttpHeaders = blobHttpHeaders
        });

        return blobClient.Uri.ToString();
    }

    public async Task DeleteFileAsync(string fileUrl)
    {
        try
        {
            var uri = new Uri(fileUrl);
            var blobClient = new BlobClient(uri);
            await blobClient.DeleteIfExistsAsync();
        }
        catch
        {
            // Ignore errors during deletion (file might not exist)
        }
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        return string.Join("_", fileName.Split(invalidChars, StringSplitOptions.RemoveEmptyEntries));
    }
}
