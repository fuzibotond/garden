namespace Garden.Modules.Tasks.Features.Questions;

public record CreateAnswerResponse
{
    public Guid AnswerId { get; init; }
    public Guid QuestionId { get; init; }
    public string AnswerText { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}
