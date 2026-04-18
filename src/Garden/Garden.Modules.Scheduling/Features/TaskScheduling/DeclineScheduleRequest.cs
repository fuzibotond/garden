namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public record DeclineScheduleRequest
{
    public Guid ScheduleRequestId { get; init; }
}
