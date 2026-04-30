using Garden.Modules.Tasks.Features.Tasks;

namespace Garden.Modules.Scheduling.Features.Jobs;

public record GetSchedulesResponse
{
    public List<ScheduleItemDto> Jobs { get; init; } = [];
    public int Total { get; init; }
}

public record ScheduleItemDto
{
    public Guid JobId { get; init; }
    public ClientDto Client { get; init; } = default!;
    public TaskItemDto Task { get; init; } = default!;
    public List<GardenerDto> LinkedGardeners { get; init; } = [];
    public bool IsApproved { get; init; }
    public DateTime? ScheduledDate { get; init; }
    public DateTime? ProposedDate { get; init; }
    public DateTime CreatedAt { get; init; }
}