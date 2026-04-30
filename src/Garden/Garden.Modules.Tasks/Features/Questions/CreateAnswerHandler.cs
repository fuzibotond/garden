using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Garden.BuildingBlocks.Events;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Tasks.Features.Questions;

public class CreateAnswerHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IEventPublisher _eventPublisher;

    public CreateAnswerHandler(
        GardenDbContext dbContext,
        ICurrentUser currentUser,
        IEventPublisher eventPublisher)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventPublisher = eventPublisher;
    }

    public async Task<CreateAnswerResponse> Handle(CreateAnswerRequest request)
    {
        var clientId = _currentUser.UserId;
        if (!clientId.HasValue || clientId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        // Verify question exists and belongs to this client
        var question = await _dbContext.TaskQuestions
            .FirstOrDefaultAsync(q => q.Id == request.QuestionId);
        
        if (question == null)
        {
            throw new KeyNotFoundException($"Question {request.QuestionId} not found");
        }

        if (question.ClientId != clientId.Value)
        {
            throw new UnauthorizedAccessException("This question is not for you");
        }

        var answerId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var answer = new TaskAnswerRecord
        {
            Id = answerId,
            QuestionId = request.QuestionId,
            ClientId = clientId.Value,
            AnswerText = request.AnswerText,
            CreatedAtUtc = now
        };

        _dbContext.TaskAnswers.Add(answer);
        await _dbContext.SaveChangesAsync();

        // Publish event for notifications
        await _eventPublisher.PublishAsync(new TaskQuestionAnsweredEvent
        {
            AnswerId = answerId,
            QuestionId = request.QuestionId,
            TaskId = question.TaskId,
            ClientId = clientId.Value,
            GardenerId = question.GardenerId,
            AnswerText = request.AnswerText,
            CreatedAt = now
        });

        return new CreateAnswerResponse
        {
            AnswerId = answerId,
            QuestionId = request.QuestionId,
            AnswerText = request.AnswerText,
            CreatedAt = now
        };
    }
}
