using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Xunit;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity.Features.Profile;
using Garden.Api.Tests.TestHelpers;

namespace Garden.Api.Tests.Gardeners;

public class UpdateMyProfileHandlerTests
{
    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task HandleAsync_Should_Update_CompanyName()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Update_CompanyName));
        var passwordHasher = new PasswordHasher<GardenerRecord>();

        var gardener = new GardenerRecord
        {
            Id = Guid.NewGuid(),
            Email = "u@example.com",
            CompanyName = "OldCo",
            PasswordHash = passwordHasher.HashPassword(null!, "pw"),
            CreatedAtUtc = DateTime.UtcNow
        };
        context.Gardeners.Add(gardener);
        await context.SaveChangesAsync();

        var current = new FakeCurrentUser { IsAuthenticated = true, UserId = gardener.Id };
        var handler = new UpdateMyProfileHandler(context, current);

        var request = new UpdateMyProfileRequest("NewCo");

        var response = await handler.HandleAsync(request);

        response.CompanyName.Should().Be("NewCo");

        var stored = await context.Gardeners.FirstOrDefaultAsync(x => x.Id == gardener.Id);
        stored!.CompanyName.Should().Be("NewCo");
    }

    [Fact]
    public async Task HandleAsync_Should_Throw_When_User_Is_Not_Authenticated()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Throw_When_User_Is_Not_Authenticated));
        var current = new FakeCurrentUser { IsAuthenticated = false };
        var handler = new UpdateMyProfileHandler(context, current);

        var request = new UpdateMyProfileRequest("X");

        await Assert.ThrowsAsync<InvalidOperationException>(async () => await handler.HandleAsync(request));
    }

    

    [Fact]
    public async Task HandleAsync_Should_Throw_When_Gardener_Profile_Does_Not_Exist()
    {
        var context = CreateContext(nameof(HandleAsync_Should_Throw_When_Gardener_Profile_Does_Not_Exist));
        var current = new FakeCurrentUser { IsAuthenticated = true, UserId = Guid.NewGuid() };
        var handler = new UpdateMyProfileHandler(context, current);

        var request = new UpdateMyProfileRequest("NewCo");

        await Assert.ThrowsAsync<InvalidOperationException>(async () => await handler.HandleAsync(request));
    }
}
