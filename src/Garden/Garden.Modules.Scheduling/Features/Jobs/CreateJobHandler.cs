using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Scheduling.Features.Jobs;

public class CreateJobHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public CreateJobHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<CreateJobResponse> Handle(CreateJobRequest request)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        // Verify client exists
        var client = await _dbContext.Clients.FindAsync(request.ClientId);
        if (client == null)
        {
            throw new KeyNotFoundException($"Client {request.ClientId} not found");
        }

        var jobId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var job = new JobRecord
        {
            Id = jobId,
            ClientId = request.ClientId,
            Name = request.Name,
            CreatedAtUtc = now,
            UpdatedAtUtc = now
        };

        _dbContext.Jobs.Add(job);

        // Add gardeners to job if provided
        var gardenerIds = new List<Guid>();
        var isAdmin = _currentUser.Roles.Contains("Admin");

        // If creating gardener is not admin, automatically assign them to the job
        if (!isAdmin)
        {
            var gardener = await _dbContext.Gardeners.FindAsync(userId.Value);
            if (gardener != null)
            {
                _dbContext.JobGardeners.Add(new JobGardenerRecord
                {
                    Id = Guid.NewGuid(),
                    JobId = jobId,
                    GardenerId = userId.Value
                });
                gardenerIds.Add(userId.Value);
            }
        }

        if (request.GardenerIds != null && request.GardenerIds.Count > 0)
        {
            foreach (var gardenerId in request.GardenerIds.Distinct())
            {
                // Skip if already added (creating gardener)
                if (gardenerIds.Contains(gardenerId))
                    continue;

                var gardener = await _dbContext.Gardeners.FindAsync(gardenerId);
                if (gardener != null)
                {
                    _dbContext.JobGardeners.Add(new JobGardenerRecord
                    {
                        Id = Guid.NewGuid(),
                        JobId = jobId,
                        GardenerId = gardenerId
                    });
                    gardenerIds.Add(gardenerId);
                }
            }
        }

        await _dbContext.SaveChangesAsync();

        return new CreateJobResponse
        {
            JobId = jobId,
            ClientId = request.ClientId,
            Name = request.Name,
            GardenerIds = gardenerIds,
            CreatedAt = now
        };
    }
}
