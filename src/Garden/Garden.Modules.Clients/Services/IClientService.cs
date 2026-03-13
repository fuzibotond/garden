using Garden.BuildingBlocks.Infrastructure.Persistence;

namespace Garden.Modules.Clients.Services;

public interface IClientService
{
    Task<ClientRecord> CreateClientAsync(string email, string name, string password, CancellationToken cancellationToken = default);
}
