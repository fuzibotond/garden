using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Clients.Controllers;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Api.Features.GardenerClients;

public class GetGardenerClientsHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetGardenerClientsHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<PagedResult<GardenerClientDto>> Handle(int page = 1, int pageSize = 20)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

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

        var total = allClientIds.Count;

        var items = await _dbContext.Clients
            .Where(c => allClientIds.Contains(c.Id))
            .OrderByDescending(c => c.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new GardenerClientDto
            {
                ClientId = c.Id,
                FullName = c.Name,
                Email = c.Email,
                CreatedAt = c.CreatedAtUtc,
                InvitationStatus = _dbContext.Invitations
                    .Where(i => i.Email == c.Email && i.GardenerId == currentGardenerId)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => i.Status.ToString())
                    .FirstOrDefault(),
                InvitationSentAt = _dbContext.Invitations
                    .Where(i => i.Email == c.Email && i.GardenerId == currentGardenerId)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => i.CreatedAtUtc)
                    .FirstOrDefault(),
                InvitationAcceptedAt = _dbContext.Invitations
                    .Where(i => i.Email == c.Email && i.GardenerId == currentGardenerId)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => i.AcceptedAtUtc)
                    .FirstOrDefault(),
                InvitationExpiresAt = _dbContext.Invitations
                    .Where(i => i.Email == c.Email && i.GardenerId == currentGardenerId)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => i.ExpiresAtUtc)
                    .FirstOrDefault()
            })
            .ToListAsync();

        return new PagedResult<GardenerClientDto>(items, total, page, pageSize);
    }
}
