using System;
using System.Threading.Tasks;
using FluentAssertions;
using Microsoft.EntityFrameworkCore;
using Xunit;
using QuestPDF.Infrastructure;

using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Scheduling.Features.Invoice;
using Garden.Api.Tests.TestHelpers;
using Garden.Modules.Identity;

namespace Garden.Api.Tests.Scheduling;

public class GetInvoiceHandlerTests
{
    public GetInvoiceHandlerTests()
    {
        // Bypass QuestPDF license exception for valid test runs
        QuestPDF.Settings.License = LicenseType.Community;
    }

    private static GardenDbContext CreateContext(string dbName)
    {
        var options = new DbContextOptionsBuilder<GardenDbContext>()
            .UseInMemoryDatabase(dbName)
            .Options;

        return new GardenDbContext(options);
    }

    [Fact]
    public async Task Handle_Should_Return_Pdf_For_Assigned_Gardener()
    {
        var context = CreateContext(nameof(Handle_Should_Return_Pdf_For_Assigned_Gardener));
        var gardenerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();
        var clientId = Guid.NewGuid();

        context.Gardeners.Add(new GardenerRecord
        {
            Id = gardenerId,
            Email = "gardener@example.com",
            CompanyName = "My Gardens",
            Name = "John",
            PasswordHash = "h",
            CreatedAtUtc = DateTime.UtcNow
        });

        context.Clients.Add(new ClientRecord
        {
            Id = clientId,
            Email = "client@example.com",
            Name = "Client Name",
            PasswordHash = "h",
            CreatedAtUtc = DateTime.UtcNow
        });

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = clientId,
            Name = "Job with Invoice",
            ClosedAtUtc = DateTime.UtcNow,
            InvoiceNumber = "INV-202305-ABCDEF12",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        context.JobGardeners.Add(new JobGardenerRecord
        {
            Id = Guid.NewGuid(),
            JobId = jobId,
            GardenerId = gardenerId
        });

        var taskId = Guid.NewGuid();
        context.Tasks.Add(new TaskRecord
        {
            Id = taskId,
            JobId = jobId,
            TaskTypeId = Guid.NewGuid(),
            Name = "Mowing",
            ActualTimeMinutes = 120, // 2 hours
            WagePerHour = 100m, // 200 total labor
            FinishedAtUtc = DateTime.UtcNow,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        context.TaskMaterials.Add(new TaskMaterialRecord
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            MaterialId = Guid.NewGuid(),
            SnapshotName = "Fuel",
            SnapshotAmountType = "Liter",
            UsedQuantity = 2,
            SnapshotPricePerAmount = 25m, // 50 total material
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = gardenerId,
            Roles = new[] { Roles.Gardener }
        };
        var handler = new GetInvoiceHandler(context, currentUser);

        // Act
        var result = await handler.Handle(jobId);

        // Assert
        result.Pdf.Should().NotBeEmpty();
        result.Pdf.Length.Should().BeGreaterThan(100); // Should be a valid PDF buffer (much larger than 100 actually)
        result.FileName.Should().Be("INV-202305-ABCDEF12.pdf");
    }

    [Fact]
    public async Task Handle_Should_Throw_When_Job_Not_Closed()
    {
        var context = CreateContext(nameof(Handle_Should_Throw_When_Job_Not_Closed));
        var gardenerId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = Guid.NewGuid(),
            Name = "Open Job",
            ClosedAtUtc = null, // Open job
            InvoiceNumber = null,
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser { IsAuthenticated = true, UserId = gardenerId };
        var handler = new GetInvoiceHandler(context, currentUser);

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() => handler.Handle(jobId));
    }

    [Fact]
    public async Task Handle_Should_Throw_When_Client_Not_Owner()
    {
        var context = CreateContext(nameof(Handle_Should_Throw_When_Client_Not_Owner));
        var validClientId = Guid.NewGuid();
        var wrongClientId = Guid.NewGuid();
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = validClientId,
            Name = "Closed Job",
            ClosedAtUtc = DateTime.UtcNow,
            InvoiceNumber = "INV-111",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = wrongClientId,
            Roles = new[] { Roles.Client }
        };
        var handler = new GetInvoiceHandler(context, currentUser);

        // Act & Assert
        await Assert.ThrowsAsync<UnauthorizedAccessException>(() => handler.Handle(jobId));
    }

    [Fact]
    public async Task Handle_Should_Return_Pdf_For_Admin()
    {
        var context = CreateContext(nameof(Handle_Should_Return_Pdf_For_Admin));
        var jobId = Guid.NewGuid();

        context.Jobs.Add(new JobRecord
        {
            Id = jobId,
            ClientId = Guid.NewGuid(),
            Name = "Admin access",
            ClosedAtUtc = DateTime.UtcNow,
            InvoiceNumber = "INV-ADMIN",
            CreatedAtUtc = DateTime.UtcNow,
            UpdatedAtUtc = DateTime.UtcNow
        });

        await context.SaveChangesAsync();

        var currentUser = new FakeCurrentUser
        {
            IsAuthenticated = true,
            UserId = Guid.NewGuid(),
            Roles = new[] { Roles.Admin }
        };
        var handler = new GetInvoiceHandler(context, currentUser);

        // Act
        var result = await handler.Handle(jobId);

        // Assert
        result.Pdf.Should().NotBeEmpty();
        result.FileName.Should().Be("INV-ADMIN.pdf");
    }
}
