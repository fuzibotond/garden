using Garden.BuildingBlocks.Infrastructure.Persistence;

namespace Garden.BuildingBlocks.Services;

public interface IGardenerRegistrationService
{
    Task<GardenerRecord> RegisterAsync(string email, string password, string companyName, CancellationToken cancellationToken = default);
    Task AddRefreshTokenAsync(Guid gardenerId, string token, CancellationToken cancellationToken = default);
}
