using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Gardeners.Features.LoginGardener;
using Garden.Api.Tests.TestHelpers;

namespace Garden.Api.Tests.Gardeners;

public class LoginGardenerHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task HandleAsync_Should_Return_Token_When_Credentials_Are_Valid()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Return_Token_When_Credentials_Are_Valid));
        var passwordHasher = new PasswordHasher<GardenerRecord>();

        var gardener = new GardenerRecord
        {
            Id = Guid.NewGuid(),
            Email = "user@example.com",
            CompanyName = "Co",
            PasswordHash = passwordHasher.HashPassword(null!, "Secret123"),
            CreatedAtUtc = DateTime.UtcNow
        };
        context.Gardeners.Add(gardener);
        await context.SaveChangesAsync();

        var jwt = new FakeJwtTokenService();
        var refresh = new FakeRefreshTokenService();

        var handler = new LoginGardenerHandler(context, passwordHasher, jwt, refresh);

        var request = new LoginGardenerRequest("user@example.com", "Secret123");

        var response = await handler.HandleAsync(request, default);

        response.AccessToken.Should().Be("fake-jwt-token");
        response.RefreshToken.Should().Be("fake-refresh-token");

        var storedRefresh = await context.RefreshTokens.FirstOrDefaultAsync(x => x.GardenerId == gardener.Id);
        storedRefresh.Should().NotBeNull();
    }

    [Fact]
    public async Task HandleAsync_Should_Throw_When_User_Does_Not_Exist()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Throw_When_User_Does_Not_Exist));
        var passwordHasher = new PasswordHasher<GardenerRecord>();
        var jwt = new FakeJwtTokenService();
        var refresh = new FakeRefreshTokenService();

        var handler = new LoginGardenerHandler(context, passwordHasher, jwt, refresh);

        var request = new LoginGardenerRequest("nouser@example.com", "pw");

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await handler.HandleAsync(request, default));
    }

    [Fact]
    public async Task HandleAsync_Should_Throw_When_Password_Is_Invalid()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Throw_When_Password_Is_Invalid));
        var passwordHasher = new PasswordHasher<GardenerRecord>();

        var gardener = new GardenerRecord
        {
            Id = Guid.NewGuid(),
            Email = "user2@example.com",
            CompanyName = "Co",
            PasswordHash = passwordHasher.HashPassword(null!, "RightPassword"),
            CreatedAtUtc = DateTime.UtcNow
        };
        context.Gardeners.Add(gardener);
        await context.SaveChangesAsync();

        var jwt = new FakeJwtTokenService();
        var refresh = new FakeRefreshTokenService();

        var handler = new LoginGardenerHandler(context, passwordHasher, jwt, refresh);

        var request = new LoginGardenerRequest("user2@example.com", "WrongPassword");

        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await handler.HandleAsync(request, default));
    }
}
