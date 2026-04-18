namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public record ProposeAlternativeTimeRequest
{
    public Guid ScheduleRequestId { get; init; }
    public DateTime ProposedAtUtc { get; init; }
}
