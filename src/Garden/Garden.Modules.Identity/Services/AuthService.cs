using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;

namespace Garden.Modules.Identity.Services;

public class AuthService : IAuthService
{
    private readonly GardenDbContext _dbContext;
    private readonly IPasswordHasher<GardenerRecord> _gardenerPasswordHasher;
    private readonly IPasswordHasher<ClientRecord> _clientPasswordHasher;
    private readonly IRefreshTokenService _refreshTokenService;
    private readonly IConfiguration _configuration;

    public AuthService(
        GardenDbContext dbContext,
        IPasswordHasher<GardenerRecord> gardenerPasswordHasher,
        IPasswordHasher<ClientRecord> clientPasswordHasher,
        IRefreshTokenService refreshTokenService,
        IConfiguration configuration)
    {
        _dbContext = dbContext;
        _gardenerPasswordHasher = gardenerPasswordHasher;
        _clientPasswordHasher = clientPasswordHasher;
        _refreshTokenService = refreshTokenService;
        _configuration = configuration;
    }

    public async Task<(Guid UserId, string Email, IEnumerable<string> Roles, string RefreshToken)> AuthenticateAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var normalized = email.Trim().ToLowerInvariant();

        // Check gardeners
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(x => x.Email == normalized, cancellationToken);
        if (gardener is not null)
        {
            var result = _gardenerPasswordHasher.VerifyHashedPassword(gardener, gardener.PasswordHash, password);
            if (result == PasswordVerificationResult.Failed)
                throw new InvalidOperationException("Invalid credentials.");

            var roles = new List<string> { Roles.Gardener };

            var adminEmail = _configuration["Admin:Email"] ?? "admin@garden.local";
            if (string.Equals(normalized, adminEmail, StringComparison.OrdinalIgnoreCase))
            {
                roles.Add(Roles.Admin);
            }

            var refreshToken = _refreshTokenService.GenerateToken();

            var refreshTokenRecord = new RefreshTokenRecord
            {
                Id = Guid.NewGuid(),
                GardenerId = gardener.Id,
                Token = refreshToken,
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
            };

            _dbContext.RefreshTokens.Add(refreshTokenRecord);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return (gardener.Id, gardener.Email, roles, refreshToken);
        }

        // Check clients
        var client = await _dbContext.Clients.FirstOrDefaultAsync(x => x.Email == normalized, cancellationToken);
        if (client is not null)
        {
            var result = _clientPasswordHasher.VerifyHashedPassword(client, client.PasswordHash, password);
            if (result == PasswordVerificationResult.Failed)
                throw new InvalidOperationException("Invalid credentials.");

            var roles = new[] { Roles.Client };

            var refreshToken = _refreshTokenService.GenerateToken();

            var refreshTokenRecord = new RefreshTokenRecord
            {
                Id = Guid.NewGuid(),
                GardenerId = client.Id, // reuse GardenerId column; acceptable for now
                Token = refreshToken,
                CreatedAtUtc = DateTime.UtcNow,
                ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
            };

            _dbContext.RefreshTokens.Add(refreshTokenRecord);
            await _dbContext.SaveChangesAsync(cancellationToken);

            return (client.Id, client.Email, roles, refreshToken);
        }

        throw new InvalidOperationException("Invalid credentials.");
    }
}
