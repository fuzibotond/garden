using Garden.BuildingBlocks.Infrastructure.Persistence;

namespace Garden.Modules.Clients.Services;

public interface IInvitationService
{
    Task<InvitationRecord> CreateInvitationAsync(Guid gardenerId, string email, TimeSpan? ttl = null, CancellationToken cancellationToken = default);
    Task<InvitationRecord?> ValidateTokenAsync(string token, CancellationToken cancellationToken = default);
    Task<ClientRecord> AcceptInvitationAsync(string token, string password, string fullName, CancellationToken cancellationToken = default);
}
