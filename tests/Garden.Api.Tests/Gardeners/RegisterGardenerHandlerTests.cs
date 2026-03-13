using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Gardeners.Services;

namespace Garden.Api.Tests.Gardeners;

public class RegisterGardenerHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task HandleAsync_Should_Create_Gardener()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Create_Gardener));
        var passwordHasher = new PasswordHasher<GardenerRecord>();
        var handler = new GardenerRegistrationService(context, passwordHasher);

        var gardener = await handler.RegisterAsync("test@example.com", "P@ssw0rd", "Acme Co");

        gardener.Id.Should().NotBeEmpty();
        gardener.Email.Should().Be("test@example.com");
        gardener.CompanyName.Should().Be("Acme Co");

        var stored = await context.Gardeners.FirstOrDefaultAsync(x => x.Id == gardener.Id);
        stored.Should().NotBeNull();
    }

    [Fact]
    public async Task HandleAsync_Should_Lowercase_Email()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Lowercase_Email));
        var passwordHasher = new PasswordHasher<GardenerRecord>();
        var handler = new GardenerRegistrationService(context, passwordHasher);

        var gardener = await handler.RegisterAsync("TeSt@ExAMPLE.Com", "P@ssw0rd", "Acme");

        gardener.Email.Should().Be("test@example.com");

        var stored = await context.Gardeners.FirstOrDefaultAsync(x => x.Id == gardener.Id);
        stored!.Email.Should().Be("test@example.com");
    }

    [Fact]
    public async Task HandleAsync_Should_Hash_Password()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Hash_Password));
        var passwordHasher = new PasswordHasher<GardenerRecord>();
        var handler = new GardenerRegistrationService(context, passwordHasher);

        var gardener = await handler.RegisterAsync("user@example.com", "MySecret123", "Acme");

        var stored = await context.Gardeners.FirstOrDefaultAsync(x => x.Id == gardener.Id);
        stored.Should().NotBeNull();
        stored!.PasswordHash.Should().NotBeNullOrWhiteSpace();

        var verify = passwordHasher.VerifyHashedPassword(stored, stored.PasswordHash, "MySecret123");
        verify.Should().Be(PasswordVerificationResult.Success);
    }

    [Fact]
    public async Task HandleAsync_Should_Throw_When_Email_Already_Exists()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Throw_When_Email_Already_Exists));
        var passwordHasher = new PasswordHasher<GardenerRecord>();

        // seed
        var existing = new GardenerRecord
        {
            Id = Guid.NewGuid(),
            Email = "dup@example.com",
            CompanyName = "X",
            PasswordHash = passwordHasher.HashPassword(null!, "pw"),
            CreatedAtUtc = DateTime.UtcNow
        };
        context.Gardeners.Add(existing);
        await context.SaveChangesAsync();

        var handler = new GardenerRegistrationService(context, passwordHasher);

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await handler.RegisterAsync("Dup@Example.com", "P@ss", "Co"));
    }
}
