namespace Garden.Modules.Tasks.Features.Questions;

public record UploadQuestionMediaRequest
{
    public Guid QuestionId { get; init; }
    public string MediaUrl { get; init; } = default!;
    public string MediaType { get; init; } = default!;
    public string FileName { get; init; } = default!;
}
