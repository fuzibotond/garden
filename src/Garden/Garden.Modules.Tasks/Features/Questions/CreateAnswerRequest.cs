namespace Garden.Modules.Tasks.Features.Questions;

public record CreateAnswerRequest
{
    public Guid QuestionId { get; init; }
    public string AnswerText { get; init; } = default!;
}
