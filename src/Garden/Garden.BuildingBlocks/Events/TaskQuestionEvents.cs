namespace Garden.BuildingBlocks.Events;

public class TaskQuestionCreatedEvent
{
    public Guid QuestionId { get; init; }
    public Guid TaskId { get; init; }
    public Guid GardenerId { get; init; }
    public Guid ClientId { get; init; }
    public string QuestionText { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}

public class TaskQuestionAnsweredEvent
{
    public Guid AnswerId { get; init; }
    public Guid QuestionId { get; init; }
    public Guid TaskId { get; init; }
    public Guid ClientId { get; init; }
    public Guid GardenerId { get; init; }
    public string AnswerText { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
}
