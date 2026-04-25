using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Garden.BuildingBlocks.Events;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Garden.Modules.Tasks.Features.Questions;

public class CreateQuestionHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;
    private readonly IEventPublisher _eventPublisher;

    public CreateQuestionHandler(
        GardenDbContext dbContext,
        ICurrentUser currentUser,
        IEventPublisher eventPublisher)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
        _eventPublisher = eventPublisher;
    }

    public async Task<CreateQuestionResponse> Handle(CreateQuestionRequest request)
    {
        var gardenerId = _currentUser.UserId;
        if (!gardenerId.HasValue || gardenerId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        // Verify task exists and get the client
        var task = await _dbContext.Tasks
            .FirstOrDefaultAsync(t => t.Id == request.TaskId);
        
        if (task == null)
        {
            throw new KeyNotFoundException($"Task {request.TaskId} not found");
        }

        // Get the job to find the client
        var job = await _dbContext.Jobs.FindAsync(task.JobId);
        if (job == null)
        {
            throw new KeyNotFoundException($"Job {task.JobId} not found");
        }

        // Verify gardener is assigned to this job
        var isAssigned = await _dbContext.JobGardeners
            .AnyAsync(jg => jg.JobId == job.Id && jg.GardenerId == gardenerId.Value);

        if (!isAssigned)
        {
            throw new UnauthorizedAccessException("You are not assigned to this job");
        }

        // Validate predefined options for multiple choice questions
        if (request.QuestionType == QuestionType.MultipleChoice)
        {
            if (request.PredefinedOptions == null || !request.PredefinedOptions.Any())
            {
                throw new InvalidOperationException("Multiple choice questions must have predefined options");
            }
        }

        var questionId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var question = new TaskQuestionRecord
        {
            Id = questionId,
            TaskId = request.TaskId,
            GardenerId = gardenerId.Value,
            ClientId = job.ClientId,
            QuestionText = request.QuestionText,
            QuestionType = (TaskQuestionType)request.QuestionType,
            PredefinedOptions = request.PredefinedOptions != null 
                ? JsonSerializer.Serialize(request.PredefinedOptions) 
                : null,
            CreatedAtUtc = now
        };

        _dbContext.TaskQuestions.Add(question);
        await _dbContext.SaveChangesAsync();

        // Publish event for notifications
        await _eventPublisher.PublishAsync(new TaskQuestionCreatedEvent
        {
            QuestionId = questionId,
            TaskId = request.TaskId,
            GardenerId = gardenerId.Value,
            ClientId = job.ClientId,
            QuestionText = request.QuestionText,
            CreatedAt = now
        });

        return new CreateQuestionResponse
        {
            QuestionId = questionId,
            TaskId = request.TaskId,
            QuestionText = request.QuestionText,
            QuestionType = request.QuestionType,
            PredefinedOptions = request.PredefinedOptions,
            CreatedAt = now
        };
    }
}
