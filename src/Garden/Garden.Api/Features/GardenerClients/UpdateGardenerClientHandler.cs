using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace Garden.Api.Features.GardenerClients;

public class UpdateGardenerClientHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public UpdateGardenerClientHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task Handle(Guid clientId, UpdateGardenerClientRequest request)
    {
        if (!_currentUser.IsAuthenticated || _currentUser.UserId is null)
            throw new UnauthorizedAccessException("User is not authenticated.");

        var currentGardenerId = _currentUser.UserId.Value;

        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        if (client == null)
            throw new InvalidOperationException("Client not found.");

        // Check if gardener has access via jobs with this client
        var hasJobAccess = await _dbContext.JobGardeners
            .Where(jg => jg.GardenerId == currentGardenerId)
            .Join(_dbContext.Jobs, jg => jg.JobId, j => j.Id, (jg, j) => j.ClientId)
            .AnyAsync(cId => cId == clientId);

        // Check if gardener has access via invitation to this client
        var hasInvitationAccess = await _dbContext.Invitations
            .AnyAsync(i => i.GardenerId == currentGardenerId && i.Email == client.Email);

        if (!hasJobAccess && !hasInvitationAccess)
            throw new UnauthorizedAccessException("You do not have access to this client.");

        if (!string.IsNullOrWhiteSpace(request.FullName))
            client.Name = request.FullName.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalized = request.Email.Trim().ToLowerInvariant();
            var exists = await _dbContext.Clients
                .AnyAsync(c => c.Email == normalized && c.Id != clientId);

            if (exists)
                throw new InvalidOperationException("A client with this email already exists.");

            client.Email = normalized;
        }

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx
            && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            throw new InvalidOperationException("A client with this email already exists.");
        }
    }
}

public record UpdateGardenerClientRequest(string? FullName, string? Email);
