using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.Jobs;

public class UpdateJobHandler
{
    private readonly GardenDbContext _dbContext;

    public UpdateJobHandler(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<GetJobResponse?> Handle(UpdateJobRequest request)
    {
        var job = await _dbContext.Jobs.FindAsync(request.JobId);
        if (job == null)
            return null;

        if (!string.IsNullOrEmpty(request.Name))
            job.Name = request.Name;

        job.UpdatedAtUtc = DateTime.UtcNow;

        // Update gardeners if provided
        if (request.GardenerIds != null)
        {
            var existing = await _dbContext.JobGardeners
                .Where(jg => jg.JobId == request.JobId)
                .ToListAsync();

            _dbContext.JobGardeners.RemoveRange(existing);

            foreach (var gardenerId in request.GardenerIds.Distinct())
            {
                _dbContext.JobGardeners.Add(new JobGardenerRecord
                {
                    Id = Guid.NewGuid(),
                    JobId = request.JobId,
                    GardenerId = gardenerId
                });
            }
        }

        await _dbContext.SaveChangesAsync();

        var client = await _dbContext.Clients.FindAsync(job.ClientId);

        var tasks = await _dbContext.Tasks
            .Where(t => t.JobId == request.JobId)
            .Select(t => new TaskSummaryDto
            {
                TaskId = t.Id,
                Name = t.Name,
                EstimatedTimeMinutes = t.EstimatedTimeMinutes,
                ActualTimeMinutes = t.ActualTimeMinutes
            })
            .ToListAsync();

        var gardeners = await _dbContext.JobGardeners
            .Where(jg => jg.JobId == request.JobId)
            .Join(
                _dbContext.Gardeners,
                jg => jg.GardenerId,
                g => g.Id,
                (jg, g) => new GardenerSummaryDto
                {
                    GardenerId = g.Id,
                    Name = g.Name ?? g.CompanyName,
                    Email = g.Email
                }
            )
            .ToListAsync();

        return new GetJobResponse
        {
            JobId = job.Id,
            ClientId = job.ClientId,
            ClientName = client?.Name ?? "Unknown",
            Name = job.Name,
            Tasks = tasks,
            AssignedGardeners = gardeners,
            IsClosed = job.ClosedAtUtc.HasValue,
            ClosedAt = job.ClosedAtUtc,
            InvoiceNumber = job.InvoiceNumber,
            CreatedAt = job.CreatedAtUtc,
            UpdatedAt = job.UpdatedAtUtc
        };
    }
}
