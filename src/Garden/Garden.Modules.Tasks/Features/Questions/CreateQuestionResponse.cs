namespace Garden.Modules.Tasks.Features.Questions;

public record CreateQuestionResponse
{
    public Guid QuestionId { get; init; }
    public Guid TaskId { get; init; }
    public string QuestionText { get; init; } = default!;
    public QuestionType QuestionType { get; init; }
    public List<string>? PredefinedOptions { get; init; }
    public DateTime CreatedAt { get; init; }
}
