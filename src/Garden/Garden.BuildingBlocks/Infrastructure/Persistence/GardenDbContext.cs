using Microsoft.EntityFrameworkCore;
using System.Reflection.Emit;

namespace Garden.BuildingBlocks.Infrastructure.Persistence;

public class GardenDbContext : DbContext
{
    public GardenDbContext(DbContextOptions<GardenDbContext> options) : base(options)
    {
    }

    public DbSet<GardenerRecord> Gardeners => Set<GardenerRecord>();
    public DbSet<ClientRecord> Clients => Set<ClientRecord>();
    public DbSet<RefreshTokenRecord> RefreshTokens => Set<RefreshTokenRecord>();
    public DbSet<InvitationRecord> Invitations => Set<InvitationRecord>();
    public DbSet<GardenerClientRecord> GardenerClients => Set<GardenerClientRecord>();
    public DbSet<MaterialRecord> Materials => Set<MaterialRecord>();
    public DbSet<TaskTypeRecord> TaskTypes => Set<TaskTypeRecord>();
    public DbSet<GardenerTaskTypeRecord> GardenerTaskTypes => Set<GardenerTaskTypeRecord>();
    public DbSet<JobRecord> Jobs => Set<JobRecord>();
    public DbSet<TaskRecord> Tasks => Set<TaskRecord>();
    public DbSet<TaskMaterialRecord> TaskMaterials => Set<TaskMaterialRecord>();
    public DbSet<JobGardenerRecord> JobGardeners => Set<JobGardenerRecord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GardenerRecord>(entity =>
        {
            entity.ToTable("Gardeners");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Email)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired(false);

            entity.Property(x => x.CompanyName)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.PasswordHash)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.CreatedAtUtc)
                .IsRequired();

            entity.Property(x => x.LastLogoutUtc)
                .IsRequired(false);

            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<InvitationRecord>(entity =>
        {
            entity.ToTable("Invitations");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Email)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(x => x.TokenHash)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(x => x.ExpiresAtUtc).IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.AcceptedAtUtc).IsRequired(false);

            entity.HasIndex(x => x.GardenerId);
        });

        modelBuilder.Entity<GardenerClientRecord>(entity =>
        {
            entity.ToTable("GardenerClients");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.GardenerId).IsRequired();
            entity.Property(x => x.ClientId).IsRequired();

            entity.HasIndex(x => new { x.GardenerId, x.ClientId }).IsUnique();
        });

        modelBuilder.Entity<RefreshTokenRecord>(entity =>
        {
            entity.ToTable("RefreshTokens");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Token)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.ExpiresAtUtc).IsRequired();

            entity.HasIndex(x => x.Token).IsUnique();
            entity.HasIndex(x => x.GardenerId);
        });

        modelBuilder.Entity<ClientRecord>(entity =>
        {
            entity.ToTable("Clients");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Email)
                .HasMaxLength(256)
                .IsRequired();

            entity.Property(x => x.Name)
                .HasMaxLength(200)
                .IsRequired();

            entity.Property(x => x.PasswordHash)
                .HasMaxLength(500)
                .IsRequired();

            entity.Property(x => x.CreatedAtUtc)
                .IsRequired();

            entity.Property(x => x.LastLogoutUtc)
                .IsRequired(false);

            entity.HasIndex(x => x.Email).IsUnique();
        });

        modelBuilder.Entity<MaterialRecord>(entity =>
        {
            entity.ToTable("Materials");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.GardenerId).IsRequired();
            entity.Property(x => x.Name)
                .HasMaxLength(256)
                .IsRequired();
            entity.Property(x => x.AmountType)
                .HasMaxLength(50)
                .IsRequired();
            entity.Property(x => x.PricePerAmount)
                .HasPrecision(18, 2)
                .IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.GardenerId);
        });

        modelBuilder.Entity<TaskTypeRecord>(entity =>
        {
            entity.ToTable("TaskTypes");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Name)
                .HasMaxLength(256)
                .IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();
        });

        modelBuilder.Entity<GardenerTaskTypeRecord>(entity =>
        {
            entity.ToTable("GardenerTaskTypes");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.GardenerId).IsRequired();
            entity.Property(x => x.TaskTypeId).IsRequired();

            entity.HasIndex(x => new { x.GardenerId, x.TaskTypeId }).IsUnique();
        });

        modelBuilder.Entity<JobRecord>(entity =>
        {
            entity.ToTable("Jobs");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.ClientId).IsRequired();
            entity.Property(x => x.Name)
                .HasMaxLength(512)
                .IsRequired();
            entity.Property(x => x.ClosedAtUtc).IsRequired(false);
            entity.Property(x => x.InvoiceNumber).HasMaxLength(50).IsRequired(false);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();

            entity.HasIndex(x => x.ClientId);
        });

        modelBuilder.Entity<TaskRecord>(entity =>
        {
            entity.ToTable("Tasks");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.JobId).IsRequired();
            entity.Property(x => x.TaskTypeId).IsRequired();
            entity.Property(x => x.Name)
                .HasMaxLength(512)
                .IsRequired();
            entity.Property(x => x.Description)
                .HasMaxLength(2048)
                .IsRequired(false);
            entity.Property(x => x.EstimatedTimeMinutes).IsRequired(false);
            entity.Property(x => x.ActualTimeMinutes).IsRequired(false);
            entity.Property(x => x.WagePerHour)
                .HasPrecision(18, 2)
                .IsRequired(false);
            entity.Property(x => x.StartedAtUtc).IsRequired(false);
            entity.Property(x => x.FinishedAtUtc).IsRequired(false);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();

            entity.HasIndex(x => x.JobId);
            entity.HasIndex(x => x.TaskTypeId);
        });

        modelBuilder.Entity<TaskMaterialRecord>(entity =>
        {
            entity.ToTable("TaskMaterials");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.TaskId).IsRequired();
            entity.Property(x => x.MaterialId).IsRequired();
            entity.Property(x => x.UsedQuantity)
                .HasPrecision(18, 2)
                .IsRequired();
            entity.Property(x => x.SnapshotName)
                .HasMaxLength(256)
                .IsRequired(false);
            entity.Property(x => x.SnapshotAmountType)
                .HasMaxLength(50)
                .IsRequired(false);
            entity.Property(x => x.SnapshotPricePerAmount)
                .HasPrecision(18, 2)
                .IsRequired(false);

            entity.HasIndex(x => new { x.TaskId, x.MaterialId }).IsUnique();
        });

        modelBuilder.Entity<JobGardenerRecord>(entity =>
        {
            entity.ToTable("JobGardeners");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.JobId).IsRequired();
            entity.Property(x => x.GardenerId).IsRequired();

            entity.HasIndex(x => new { x.JobId, x.GardenerId }).IsUnique();
        });
    }
}

public class GardenerRecord
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string CompanyName { get; set; } = default!;
    public string? Name { get; set; }
    public string PasswordHash { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? LastLogoutUtc { get; set; }
}

public class ClientRecord
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? LastLogoutUtc { get; set; }
}

public class InvitationRecord
{
    public Guid Id { get; set; }
    public Guid GardenerId { get; set; }
    public string Email { get; set; } = default!;
    public string TokenHash { get; set; } = default!;
    public DateTime ExpiresAtUtc { get; set; }
    public InvitationStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? AcceptedAtUtc { get; set; }
}

public enum InvitationStatus
{
    Pending = 0,
    Accepted = 1,
    Revoked = 2,
    Expired = 3
}

public class GardenerClientRecord
{
    public Guid Id { get; set; }
    public Guid GardenerId { get; set; }
    public Guid ClientId { get; set; }
}

public class MaterialRecord
{
    public Guid Id { get; set; }
    public Guid GardenerId { get; set; }
    public string Name { get; set; } = default!;
    public string AmountType { get; set; } = default!;
    public decimal PricePerAmount { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public class TaskTypeRecord
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; }
}

public class GardenerTaskTypeRecord
{
    public Guid Id { get; set; }
    public Guid GardenerId { get; set; }
    public Guid TaskTypeId { get; set; }
}

public class JobRecord
{
    public Guid Id { get; set; }
    public Guid ClientId { get; set; }
    public string Name { get; set; } = default!;
    public DateTime? ClosedAtUtc { get; set; }
    public string? InvoiceNumber { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class TaskRecord
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public Guid TaskTypeId { get; set; }
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public int? EstimatedTimeMinutes { get; set; }
    public int? ActualTimeMinutes { get; set; }
    public decimal? WagePerHour { get; set; }
    public DateTime? StartedAtUtc { get; set; }
    public DateTime? FinishedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public class TaskMaterialRecord
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid MaterialId { get; set; }
    public decimal UsedQuantity { get; set; }
    public string? SnapshotName { get; set; }
    public string? SnapshotAmountType { get; set; }
    public decimal? SnapshotPricePerAmount { get; set; }
}

public class JobGardenerRecord
{
    public Guid Id { get; set; }
    public Guid JobId { get; set; }
    public Guid GardenerId { get; set; }
}
