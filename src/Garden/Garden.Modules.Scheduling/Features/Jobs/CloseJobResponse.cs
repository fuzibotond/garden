namespace Garden.Modules.Scheduling.Features.Jobs;

public record CloseJobResponse
{
    public Guid JobId { get; init; }
    public string InvoiceNumber { get; init; } = default!;
    public DateTime ClosedAt { get; init; }
}
