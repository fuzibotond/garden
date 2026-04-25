namespace Garden.BuildingBlocks.Services;

/// <summary>
/// Local file storage implementation for development/testing
/// Stores files in wwwroot/uploads directory
/// </summary>
public class LocalFileStorageService : IBlobStorageService
{
    private readonly string _baseUploadPath;
    private readonly string _baseUrl;

    public LocalFileStorageService(string baseUploadPath = "wwwroot/uploads", string baseUrl = "http://localhost:5000/uploads")
    {
        _baseUploadPath = baseUploadPath;
        _baseUrl = baseUrl;
    }

    public async Task<string> UploadFileAsync(string fileData, string fileName, string contentType, string containerName = "media")
    {
        // Parse base64 data (remove data URI prefix if present)
        var base64Data = fileData;
        if (fileData.Contains("base64,"))
        {
            base64Data = fileData.Split("base64,")[1];
        }

        var fileBytes = Convert.FromBase64String(base64Data);

        // Create directory if it doesn't exist
        var containerPath = Path.Combine(_baseUploadPath, containerName);
        Directory.CreateDirectory(containerPath);

        // Generate unique file name
        var uniqueFileName = $"{Guid.NewGuid()}_{SanitizeFileName(fileName)}";
        var filePath = Path.Combine(containerPath, uniqueFileName);

        // Write file
        await File.WriteAllBytesAsync(filePath, fileBytes);

        // Return public URL
        return $"{_baseUrl.TrimEnd('/')}/{containerName}/{uniqueFileName}";
    }

    public Task DeleteFileAsync(string fileUrl)
    {
        try
        {
            // Extract file path from URL
            var uri = new Uri(fileUrl);
            var segments = uri.Segments;
            
            if (segments.Length >= 2)
            {
                var containerName = segments[^2].TrimEnd('/');
                var fileName = segments[^1];
                var filePath = Path.Combine(_baseUploadPath, containerName, fileName);

                if (File.Exists(filePath))
                {
                    File.Delete(filePath);
                }
            }
        }
        catch
        {
            // Ignore errors during deletion
        }

        return Task.CompletedTask;
    }

    private static string SanitizeFileName(string fileName)
    {
        var invalidChars = Path.GetInvalidFileNameChars();
        return string.Join("_", fileName.Split(invalidChars, StringSplitOptions.RemoveEmptyEntries));
    }
}
