using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Tasks.Features.Questions;

public class UploadAnswerMediaHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IBlobStorageService _blobStorageService;

    public UploadAnswerMediaHandler(GardenDbContext dbContext, ICurrentUser currentUser, IBlobStorageService blobStorageService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _blobStorageService = blobStorageService;
    }

    public async Task<UploadAnswerMediaResponse> Handle(UploadAnswerMediaRequest request)
    {
        var clientId = _currentUser.UserId;
        if (!clientId.HasValue || clientId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        // Verify answer exists and belongs to this client
        var answer = await _dbContext.TaskAnswers
            .FirstOrDefaultAsync(a => a.Id == request.AnswerId);
        
        if (answer == null)
        {
            throw new KeyNotFoundException($"Answer {request.AnswerId} not found");
        }

        if (answer.ClientId != clientId.Value)
        {
            throw new UnauthorizedAccessException("This answer does not belong to you");
        }

        // Upload file to blob storage and get URL
        var uploadedUrl = await _blobStorageService.UploadFileAsync(
            request.MediaUrl,
            request.FileName,
            request.MediaType,
            "answer-media");

        var mediaId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var media = new TaskAnswerMediaRecord
        {
            Id = mediaId,
            AnswerId = request.AnswerId,
            MediaUrl = uploadedUrl,
            MediaType = request.MediaType,
            FileName = request.FileName,
            UploadedAtUtc = now
        };

        _dbContext.TaskAnswerMedia.Add(media);
        await _dbContext.SaveChangesAsync();

        return new UploadAnswerMediaResponse
        {
            MediaId = mediaId,
            AnswerId = request.AnswerId,
            MediaUrl = uploadedUrl,
            MediaType = request.MediaType,
            FileName = request.FileName,
            UploadedAt = now
        };
    }
}
