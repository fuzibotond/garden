using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Gardeners.Features.RegisterGardener;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

public class RegisterGardenerHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly IPasswordHasher<GardenerRecord> _passwordHasher;

    public RegisterGardenerHandler(
        GardenDbContext dbContext,
        IPasswordHasher<GardenerRecord> passwordHasher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
    }

    public async Task<RegisterGardenerResponse> HandleAsync(
        RegisterGardenerRequest request,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException("Email is required.");

        if (string.IsNullOrWhiteSpace(request.Password))
            throw new ArgumentException("Password is required.");

        if (string.IsNullOrWhiteSpace(request.CompanyName))
            throw new ArgumentException("Company name is required.");

        var email = request.Email.Trim().ToLowerInvariant();

        var exists = await _dbContext.Gardeners
            .AnyAsync(x => x.Email == email, cancellationToken);

        if (exists)
            throw new InvalidOperationException("A gardener with this email already exists.");

        var gardener = new GardenerRecord
        {
            Id = Guid.NewGuid(),
            Email = email,
            CompanyName = request.CompanyName.Trim(),
            CreatedAtUtc = DateTime.UtcNow
        };

        gardener.PasswordHash = _passwordHasher.HashPassword(gardener, request.Password);

        _dbContext.Gardeners.Add(gardener);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new RegisterGardenerResponse(
            gardener.Id,
            gardener.Email,
            gardener.CompanyName
        );
    }
}