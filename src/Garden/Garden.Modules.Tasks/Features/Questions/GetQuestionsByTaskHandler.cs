using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Garden.Modules.Tasks.Features.Questions;

public class GetQuestionsByTaskHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetQuestionsByTaskHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetQuestionsByTaskResponse> Handle(Guid taskId)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        // Verify task exists
        var task = await _dbContext.Tasks.FindAsync(taskId);
        if (task == null)
        {
            throw new KeyNotFoundException($"Task {taskId} not found");
        }

        // Get the job to verify access
        var job = await _dbContext.Jobs.FindAsync(task.JobId);
        if (job == null)
        {
            throw new KeyNotFoundException($"Job {task.JobId} not found");
        }

        // Verify user has access (either gardener assigned to job or client who owns job)
        var isGardener = await _dbContext.JobGardeners
            .AnyAsync(jg => jg.JobId == job.Id && jg.GardenerId == userId.Value);
        var isClient = job.ClientId == userId.Value;

        if (!isGardener && !isClient)
        {
            throw new UnauthorizedAccessException("You don't have access to this task");
        }

        // Get questions with answers and media
        var questions = await _dbContext.TaskQuestions
            .Where(q => q.TaskId == taskId)
            .OrderBy(q => q.CreatedAtUtc)
            .ToListAsync();

        var questionIds = questions.Select(q => q.Id).ToList();

        var answers = await _dbContext.TaskAnswers
            .Where(a => questionIds.Contains(a.QuestionId))
            .OrderBy(a => a.CreatedAtUtc)
            .ToListAsync();

        var questionMedia = await _dbContext.TaskQuestionMedia
            .Where(m => questionIds.Contains(m.QuestionId))
            .ToListAsync();

        var answerIds = answers.Select(a => a.Id).ToList();
        var answerMedia = await _dbContext.TaskAnswerMedia
            .Where(m => answerIds.Contains(m.AnswerId))
            .ToListAsync();

        var questionDtos = questions.Select(q => new QuestionDto
        {
            QuestionId = q.Id,
            TaskId = q.TaskId,
            GardenerId = q.GardenerId,
            QuestionText = q.QuestionText,
            QuestionType = (QuestionType)q.QuestionType,
            PredefinedOptions = !string.IsNullOrEmpty(q.PredefinedOptions)
                ? JsonSerializer.Deserialize<List<string>>(q.PredefinedOptions)
                : null,
            CreatedAt = q.CreatedAtUtc,
            Answers = answers
                .Where(a => a.QuestionId == q.Id)
                .Select(a => new AnswerDto
                {
                    AnswerId = a.Id,
                    ClientId = a.ClientId,
                    AnswerText = a.AnswerText,
                    CreatedAt = a.CreatedAtUtc,
                    Media = answerMedia
                        .Where(m => m.AnswerId == a.Id)
                        .Select(m => new MediaDto
                        {
                            MediaId = m.Id,
                            MediaUrl = m.MediaUrl,
                            MediaType = m.MediaType,
                            FileName = m.FileName,
                            UploadedAt = m.UploadedAtUtc
                        })
                        .ToList()
                })
                .ToList(),
            Media = questionMedia
                .Where(m => m.QuestionId == q.Id)
                .Select(m => new MediaDto
                {
                    MediaId = m.Id,
                    MediaUrl = m.MediaUrl,
                    MediaType = m.MediaType,
                    FileName = m.FileName,
                    UploadedAt = m.UploadedAtUtc
                })
                .ToList()
        }).ToList();

        return new GetQuestionsByTaskResponse
        {
            Questions = questionDtos
        };
    }
}
