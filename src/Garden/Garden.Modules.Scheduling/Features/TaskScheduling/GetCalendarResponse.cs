namespace Garden.Modules.Scheduling.Features.TaskScheduling;

public record GetCalendarResponse
{
    public List<TaskScheduleDto> ScheduledTasks { get; init; } = [];
    public int TotalCount { get; init; }
    public int Page { get; init; }
    public int PageSize { get; init; }
}
