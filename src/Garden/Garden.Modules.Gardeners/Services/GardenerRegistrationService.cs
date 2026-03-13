using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Gardeners.Services;

public class GardenerRegistrationService : IGardenerRegistrationService
{
    private readonly GardenDbContext _dbContext;
    private readonly IPasswordHasher<GardenerRecord> _passwordHasher;

    public GardenerRegistrationService(GardenDbContext dbContext, IPasswordHasher<GardenerRecord> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<GardenerRecord> RegisterAsync(string email, string password, string companyName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email))
            throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Password is required.");
        if (string.IsNullOrWhiteSpace(companyName))
            throw new ArgumentException("Company name is required.");

        var normalizedEmail = email.Trim().ToLowerInvariant();

        var exists = await _dbContext.Gardeners.AnyAsync(x => x.Email == normalizedEmail, cancellationToken);
        if (exists)
            throw new InvalidOperationException("A gardener with this email already exists.");

        var gardener = new GardenerRecord
        {
            Id = Guid.NewGuid(),
            Email = normalizedEmail,
            CompanyName = companyName.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        gardener.PasswordHash = _passwordHasher.HashPassword(gardener, password);

        _dbContext.Gardeners.Add(gardener);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return gardener;
    }

    public async Task AddRefreshTokenAsync(Guid gardenerId, string token, CancellationToken cancellationToken = default)
    {
        var record = new RefreshTokenRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardenerId,
            Token = token,
            CreatedAtUtc = DateTime.UtcNow,
            ExpiresAtUtc = DateTime.UtcNow.AddDays(7)
        };

        _dbContext.RefreshTokens.Add(record);
        await _dbContext.SaveChangesAsync(cancellationToken);
    }
}
