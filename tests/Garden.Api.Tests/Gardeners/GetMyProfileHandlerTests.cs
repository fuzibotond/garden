using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity.Features.Profile;
using Garden.Api.Tests.TestHelpers;

namespace Garden.Api.Tests.Gardeners;

public class GetMyProfileHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task HandleAsync_Should_Return_Profile_For_Authenticated_User()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Return_Profile_For_Authenticated_User));

        var gardener = new GardenerRecord
        {
            Id = Guid.NewGuid(),
            Email = "me@example.com",
            CompanyName = "Co",
            PasswordHash = "h",
            CreatedAtUtc = DateTime.UtcNow
        };
        context.Gardeners.Add(gardener);
        await context.SaveChangesAsync();

        var current = new FakeCurrentUser { IsAuthenticated = true, UserId = gardener.Id, Email = gardener.Email };
        var handler = new GetMyProfileHandler(context, current);

        var response = await handler.HandleAsync();

        response.GardenerId.Should().Be(gardener.Id);
        response.Email.Should().Be(gardener.Email);
    }

    [Fact]
    public async Task HandleAsync_Should_Throw_When_User_Is_Not_Authenticated()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Throw_When_User_Is_Not_Authenticated));
        var current = new FakeCurrentUser { IsAuthenticated = false };
        var handler = new GetMyProfileHandler(context, current);

        await Assert.ThrowsAsync<InvalidOperationException>(async () => await handler.HandleAsync());
    }

    [Fact]
    public async Task HandleAsync_Should_Throw_When_Gardener_Profile_Does_Not_Exist()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Throw_When_Gardener_Profile_Does_Not_Exist));
        var current = new FakeCurrentUser { IsAuthenticated = true, UserId = Guid.NewGuid() };
        var handler = new GetMyProfileHandler(context, current);

        await Assert.ThrowsAsync<InvalidOperationException>(async () => await handler.HandleAsync());
    }
}
