using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Clients.Controllers;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Api.Features.GardenerClients;

public class GetGardenerClientHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetGardenerClientHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GardenerClientDto?> Handle(Guid id)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        var currentGardenerId = _currentUser.UserId.Value;

        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == id);
        if (client == null)
            return null;

        // Check if gardener has access via jobs with this client
        var hasJobAccess = await _dbContext.JobGardeners
            .Where(jg => jg.GardenerId == currentGardenerId)
            .Join(_dbContext.Jobs, jg => jg.JobId, j => j.Id, (jg, j) => j.ClientId)
            .AnyAsync(clientId => clientId == id);

        // Check if gardener has access via invitation to this client
        var hasInvitationAccess = await _dbContext.Invitations
            .AnyAsync(i => i.GardenerId == currentGardenerId && i.Email == client.Email);

        if (!hasJobAccess && !hasInvitationAccess)
            throw new UnauthorizedAccessException("You do not have access to this client.");

        var invitation = await _dbContext.Invitations
            .Where(i => i.Email == client.Email && i.GardenerId == currentGardenerId)
            .OrderByDescending(i => i.CreatedAtUtc)
            .FirstOrDefaultAsync();

        return new GardenerClientDto
        {
            ClientId = client.Id,
            FullName = client.Name,
            Email = client.Email,
            CreatedAt = client.CreatedAtUtc,
            InvitationStatus = invitation?.Status.ToString(),
            InvitationSentAt = invitation?.CreatedAtUtc,
            InvitationAcceptedAt = invitation?.AcceptedAtUtc,
            InvitationExpiresAt = invitation?.ExpiresAtUtc
        };
    }
}
