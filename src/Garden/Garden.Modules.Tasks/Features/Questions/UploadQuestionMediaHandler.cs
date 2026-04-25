using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Tasks.Features.Questions;

public class UploadQuestionMediaHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IBlobStorageService _blobStorageService;

    public UploadQuestionMediaHandler(GardenDbContext dbContext, ICurrentUser currentUser, IBlobStorageService blobStorageService)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _blobStorageService = blobStorageService;
    }

    public async Task<UploadQuestionMediaResponse> Handle(UploadQuestionMediaRequest request)
    {
        var gardenerId = _currentUser.UserId;
        if (!gardenerId.HasValue || gardenerId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        // Verify question exists and belongs to this gardener
        var question = await _dbContext.TaskQuestions
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId);
        
        if (question == null)
        {
            throw new KeyNotFoundException($"Question {request.QuestionId} not found");
        }

        if (question.GardenerId != gardenerId.Value)
        {
            throw new UnauthorizedAccessException("This question does not belong to you");
        }

        // Upload file to blob storage and get URL
        var uploadedUrl = await _blobStorageService.UploadFileAsync(
            request.MediaUrl,
            request.FileName,
            request.MediaType,
            "question-media");

        var mediaId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var media = new TaskQuestionMediaRecord
        {
            Id = mediaId,
            QuestionId = request.QuestionId,
            MediaUrl = uploadedUrl,
            MediaType = request.MediaType,
            FileName = request.FileName,
            UploadedAtUtc = now
        };

        _dbContext.TaskQuestionMedia.Add(media);
        await _dbContext.SaveChangesAsync();

        return new UploadQuestionMediaResponse
        {
            MediaId = mediaId,
            QuestionId = request.QuestionId,
            MediaUrl = uploadedUrl,
            MediaType = request.MediaType,
            FileName = request.FileName,
            UploadedAt = now
        };
    }
}
