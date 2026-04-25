using System.Text.Json;

namespace Garden.Modules.Tasks.Features.Questions;

public record GetQuestionsByTaskResponse
{
    public List<QuestionDto> Questions { get; init; } = new();
}

public record QuestionDto
{
    public Guid QuestionId { get; init; }
    public Guid TaskId { get; init; }
    public Guid GardenerId { get; init; }
    public string QuestionText { get; init; } = default!;
    public QuestionType QuestionType { get; init; }
    public List<string>? PredefinedOptions { get; init; }
    public DateTime CreatedAt { get; init; }
    public List<AnswerDto> Answers { get; init; } = new();
    public List<MediaDto> Media { get; init; } = new();
}

public record AnswerDto
{
    public Guid AnswerId { get; init; }
    public Guid ClientId { get; init; }
    public string AnswerText { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public List<MediaDto> Media { get; init; } = new();
}

public record MediaDto
{
    public Guid MediaId { get; init; }
    public string MediaUrl { get; init; } = default!;
    public string MediaType { get; init; } = default!;
    public string FileName { get; init; } = default!;
    public DateTime UploadedAt { get; init; }
}
