namespace Garden.Modules.Tasks.Features.Questions;

public record UploadQuestionMediaResponse
{
    public Guid MediaId { get; init; }
    public Guid QuestionId { get; init; }
    public string MediaUrl { get; init; } = default!;
    public string MediaType { get; init; } = default!;
    public string FileName { get; init; } = default!;
    public DateTime UploadedAt { get; init; }
}
