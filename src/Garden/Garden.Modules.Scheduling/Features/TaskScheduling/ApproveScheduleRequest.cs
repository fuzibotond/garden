namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public record ApproveScheduleRequest
{
    public Guid ScheduleRequestId { get; init; }
}
