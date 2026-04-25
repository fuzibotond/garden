namespace Garden.BuildingBlocks.Services;

public interface IBlobStorageService
{
    /// <summary>
    /// Uploads a file to blob storage and returns the URL
    /// </summary>
    /// <param name="fileData">Base64 encoded file data (with or without data URI prefix)</param>
    /// <param name="fileName">Original filename</param>
    /// <param name="contentType">MIME type of the file</param>
    /// <param name="containerName">Container name (default: media)</param>
    /// <returns>Public URL to the uploaded file</returns>
    Task<string> UploadFileAsync(string fileData, string fileName, string contentType, string containerName = "media");

    /// <summary>
    /// Deletes a file from blob storage
    /// </summary>
    /// <param name="fileUrl">Full URL to the file</param>
    Task DeleteFileAsync(string fileUrl);
}
