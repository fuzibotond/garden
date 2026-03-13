using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Clients.Services;

public class ClientService : IClientService
{
    private readonly GardenDbContext _dbContext;
    private readonly IPasswordHasher<ClientRecord> _passwordHasher;

    public ClientService(GardenDbContext dbContext, IPasswordHasher<ClientRecord> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<ClientRecord> CreateClientAsync(string email, string name, string password, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email)) throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(name)) throw new ArgumentException("Name is required.");
        if (string.IsNullOrWhiteSpace(password)) throw new ArgumentException("Password is required.");

        var normalizedEmail = email.Trim().ToLowerInvariant();

        var exists = await _dbContext.Clients.AnyAsync(x => x.Email == normalizedEmail, cancellationToken);
        if (exists) throw new InvalidOperationException("A client with this email already exists.");

        var client = new ClientRecord
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            Name = name.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        client.PasswordHash = _passwordHasher.HashPassword(client, password);

        _dbContext.Clients.Add(client);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return client;
    }
}
