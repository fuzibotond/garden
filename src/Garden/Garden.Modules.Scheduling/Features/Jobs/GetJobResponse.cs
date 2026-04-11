namespace Garden.Modules.Scheduling.Features.Jobs;

public record GetJobResponse
{
    public Guid JobId { get; init; }
    public Guid ClientId { get; init; }
    public string ClientName { get; init; } = default!;
    public string Name { get; init; } = default!;
    public List<TaskSummaryDto> Tasks { get; init; } = [];
    public List<GardenerSummaryDto> AssignedGardeners { get; init; } = [];
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record TaskSummaryDto
{
    public Guid TaskId { get; init; }
    public string Name { get; init; } = default!;
    public int? EstimatedTimeMinutes { get; init; }
    public int? ActualTimeMinutes { get; init; }
}

public record GardenerSummaryDto
{
    public Guid GardenerId { get; init; }
    public string Name { get; init; } = default!;
    public string Email { get; init; } = default!;
}
