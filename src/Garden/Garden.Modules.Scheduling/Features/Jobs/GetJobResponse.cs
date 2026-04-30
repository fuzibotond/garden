namespace Garden.Modules.Scheduling.Features.Jobs;

public record GetJobResponse
{
    public Guid JobId { get; init; }
    public Guid ClientId { get; init; }
    public string ClientName { get; init; } = default!;
    public string Name { get; init; } = default!;
    public List<TaskSummaryDto> Tasks { get; init; } = [];
    public int TaskCount { get; init; }
    public int FinishedTaskCount { get; init; }
    public int InProgressTaskCount { get; init; }
    public int NotStartedTaskCount { get; init; }
    public decimal ProgressPercent { get; init; }
    public int TotalEstimatedTimeMinutes { get; init; }
    public int TotalActualTimeMinutes { get; init; }
    public int TimeDifferenceMinutes { get; init; }
    public decimal ActualVsEstimatedPercent { get; init; }
    public decimal TotalMaterialCost { get; init; }
    public decimal TotalLaborCost { get; init; }
    public decimal TotalCost => TotalMaterialCost + TotalLaborCost;
    public List<GardenerSummaryDto> AssignedGardeners { get; init; } = [];
    public bool IsClosed { get; init; }
    public DateTime? ClosedAt { get; init; }
    public string? InvoiceNumber { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record TaskSummaryDto
{
    public Guid TaskId { get; init; }
    public string Name { get; init; } = default!;
    public int? EstimatedTimeMinutes { get; init; }
    public int? ActualTimeMinutes { get; init; }
    public decimal? WagePerHour { get; init; }
    public decimal TotalMaterialCost { get; init; }
    public decimal TotalLaborCost { get; init; }
    public decimal TotalCost => TotalMaterialCost + TotalLaborCost;
    public DateTime? StartedAt { get; init; }
    public DateTime? FinishedAt { get; init; }
}

public record GardenerSummaryDto
{
    public Guid GardenerId { get; init; }
    public string Name { get; init; } = default!;
    public string Email { get; init; } = default!;
}
