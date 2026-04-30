namespace Garden.Modules.Tasks.Features.Questions;

public record CreateQuestionRequest
{
    public Guid TaskId { get; init; }
    public string QuestionText { get; init; } = default!;
    public QuestionType QuestionType { get; init; }
    public List<string>? PredefinedOptions { get; init; }
}

public enum QuestionType
{
    FreeText = 0,
    MultipleChoice = 1
}
