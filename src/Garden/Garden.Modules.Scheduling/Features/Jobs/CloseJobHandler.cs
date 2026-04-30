using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.Jobs;

public class CloseJobHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public CloseJobHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<CloseJobResponse> Handle(Guid jobId)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        var job = await _dbContext.Jobs.FindAsync(jobId);
        if (job == null)
            throw new KeyNotFoundException($"Job {jobId} not found.");

        var isAssigned = await _dbContext.JobGardeners
            .AnyAsync(jg => jg.JobId == jobId && jg.GardenerId == _currentUser.UserId.Value);

        if (!isAssigned)
            throw new UnauthorizedAccessException("You are not assigned to this job.");

        if (job.ClosedAtUtc.HasValue)
            throw new InvalidOperationException("Job is already closed.");

        var hasUnfinishedTasks = await _dbContext.Tasks
            .AnyAsync(t => t.JobId == jobId && t.FinishedAtUtc == null);

        if (hasUnfinishedTasks)
            throw new InvalidOperationException("All tasks must be finished before closing the job.");

        var now = DateTime.UtcNow;
        job.ClosedAtUtc = now;
        job.InvoiceNumber = GenerateInvoiceNumber(job.Id, now);
        job.UpdatedAtUtc = now;

        await _dbContext.SaveChangesAsync();

        return new CloseJobResponse
        {
            JobId = job.Id,
            InvoiceNumber = job.InvoiceNumber,
            ClosedAt = now
        };
    }

    private static string GenerateInvoiceNumber(Guid jobId, DateTime closedAt) =>
        $"INV-{closedAt:yyyyMM}-{jobId.ToString("N")[..8].ToUpper()}";
}
