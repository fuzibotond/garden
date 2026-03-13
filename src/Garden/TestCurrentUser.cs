csharp Garden.Modules.Identity.Tests\GetMyProfileHandlerTests.cs
using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Xunit;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity.Features.Profile;
using Garden.Modules.Identity;

namespace Garden.Modules.Identity.Tests
{
    // Minimal test double matching the ICurrentUser surface used by the handler
    internal class TestCurrentUser : ICurrentUser
    {
        public bool IsAuthenticated { get; set; }
        public Guid? UserId { get; set; }
        public DateTime? IssuedAtUtc { get; set; }
    }

    public class GetMyProfileHandlerTests
    {
        private static GardenDbContext CreateInMemoryContext()
        {
            var options = new DbContextOptionsBuilder<GardenDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;

            return new GardenDbContext(options);
        }

        [Fact]
        public async Task HandleAsync_ReturnsGardenerProfile_WhenCurrentUserIsGardener()
        {
            // Arrange
            var db = CreateInMemoryContext();
            var gardenerId = Guid.NewGuid();
            var gardener = new GardenerRecord
            {
                Id = gardenerId,
                Email = "gardener@example.com",
                CompanyName = "Gardener Co",
                PasswordHash = "hash",
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Gardeners.Add(gardener);
            await db.SaveChangesAsync();

            var currentUser = new TestCurrentUser
            {
                IsAuthenticated = true,
                UserId = gardenerId,
                IssuedAtUtc = DateTime.UtcNow
            };

            var handler = new GetMyProfileHandler(db, currentUser);

            // Act
            var result = await handler.HandleAsync();

            // Assert
            Assert.Equal(gardenerId, result.Id);
            Assert.Equal(gardener.Email, result.Email);
            Assert.Equal(gardener.CompanyName, result.DisplayName);
            Assert.Equal(gardener.CreatedAtUtc, result.CreatedAtUtc);
        }

        [Fact]
        public async Task HandleAsync_ReturnsClientProfile_WhenCurrentUserIsClient()
        {
            // Arrange
            var db = CreateInMemoryContext();
            var clientId = Guid.NewGuid();
            var client = new ClientRecord
            {
                Id = clientId,
                Email = "client@example.com",
                Name = "Client Name",
                PasswordHash = "hash",
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Clients.Add(client);
            await db.SaveChangesAsync();

            var currentUser = new TestCurrentUser
            {
                IsAuthenticated = true,
                UserId = clientId,
                IssuedAtUtc = DateTime.UtcNow
            };

            var handler = new GetMyProfileHandler(db, currentUser);

            // Act
            var result = await handler.HandleAsync();

            // Assert: client.Name is mapped to the response display field
            Assert.Equal(clientId, result.Id);
            Assert.Equal(client.Email, result.Email);
            Assert.Equal(client.Name, result.DisplayName);
            Assert.Equal(client.CreatedAtUtc, result.CreatedAtUtc);
        }

        [Fact]
        public async Task HandleAsync_Throws_WhenProfileNotFound()
        {
            // Arrange
            var db = CreateInMemoryContext();

            var currentUser = new TestCurrentUser
            {
                IsAuthenticated = true,
                UserId = Guid.NewGuid(),
                IssuedAtUtc = DateTime.UtcNow
            };

            var handler = new GetMyProfileHandler(db, currentUser);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => handler.HandleAsync());
            Assert.Equal("Gardener profile was not found.", ex.Message);
        }

        [Fact]
        public async Task HandleAsync_RejectsToken_WhenGardenerLoggedOutAfterIssuedAt()
        {
            // Arrange
            var db = CreateInMemoryContext();
            var gardenerId = Guid.NewGuid();
            var now = DateTime.UtcNow;

            var gardener = new GardenerRecord
            {
                Id = gardenerId,
                Email = "gardener2@example.com",
                CompanyName = "Gardener Co 2",
                PasswordHash = "hash",
                CreatedAtUtc = now.AddMinutes(-30),
                LastLogoutUtc = now.AddMinutes(-1) // logged out after token issued below
            };
            db.Gardeners.Add(gardener);
            await db.SaveChangesAsync();

            var currentUser = new TestCurrentUser
            {
                IsAuthenticated = true,
                UserId = gardenerId,
                IssuedAtUtc = now.AddMinutes(-2) // issued before LastLogoutUtc -> should be rejected
            };

            var handler = new GetMyProfileHandler(db, currentUser);

            // Act & Assert
            var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => handler.HandleAsync());
            Assert.Equal("User is not authenticated.", ex.Message);
        }
    }
}