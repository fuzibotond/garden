using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Api.Features.GardenerClients;

public class GetGardenerClientsTotalHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetGardenerClientsTotalHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<int> Handle()
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        var currentGardenerId = _currentUser.UserId.Value;

        // Get client IDs that this gardener has jobs with
        var clientsWithJobs = await _dbContext.JobGardeners
            .Where(jg => jg.GardenerId == currentGardenerId)
            .Join(_dbContext.Jobs, jg => jg.JobId, j => j.Id, (jg, j) => j.ClientId)
            .Distinct()
            .ToListAsync();

        // Get client IDs that have invitations from this gardener
        var clientsWithInvitations = await _dbContext.Invitations
            .Where(i => i.GardenerId == currentGardenerId)
            .Select(i => i.Email)
            .Distinct()
            .Join(_dbContext.Clients, email => email, client => client.Email, (email, client) => client.Id)
            .ToListAsync();

        // Combine both lists and remove duplicates
        var allClientIds = clientsWithJobs.Union(clientsWithInvitations).Distinct().ToList();

        return allClientIds.Count;
    }
}
