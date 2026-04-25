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
    public DbSet<TaskScheduleRequestRecord> TaskScheduleRequests => Set<TaskScheduleRequestRecord>();
    public DbSet<TaskQuestionRecord> TaskQuestions => Set<TaskQuestionRecord>();
    public DbSet<TaskAnswerRecord> TaskAnswers => Set<TaskAnswerRecord>();
    public DbSet<TaskQuestionMediaRecord> TaskQuestionMedia => Set<TaskQuestionMediaRecord>();
    public DbSet<TaskAnswerMediaRecord> TaskAnswerMedia => Set<TaskAnswerMediaRecord>();

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

            entity.Property(x => x.ExpoPushToken)
                .HasMaxLength(256)
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

            entity.Property(x => x.ExpoPushToken)
                .HasMaxLength(256)
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

        modelBuilder.Entity<TaskScheduleRequestRecord>(entity =>
        {
            entity.ToTable("TaskScheduleRequests");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.TaskId).IsRequired();
            entity.Property(x => x.GardenerId).IsRequired();
            entity.Property(x => x.ClientId).IsRequired();
            entity.Property(x => x.ScheduledAtUtc).IsRequired();
            entity.Property(x => x.Status)
                .HasConversion<string>()
                .IsRequired();
            entity.Property(x => x.ProposedAtUtc).IsRequired(false);
            entity.Property(x => x.ApprovedAtUtc).IsRequired(false);
            entity.Property(x => x.DeclinedAtUtc).IsRequired(false);
            entity.Property(x => x.CreatedAtUtc).IsRequired();
            entity.Property(x => x.UpdatedAtUtc).IsRequired();

            entity.HasIndex(x => new { x.TaskId, x.ClientId }).IsUnique();
            entity.HasIndex(x => x.GardenerId);
            entity.HasIndex(x => x.ClientId);
            entity.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<TaskQuestionRecord>(entity =>
        {
            entity.ToTable("TaskQuestions");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.TaskId).IsRequired();
            entity.Property(x => x.GardenerId).IsRequired();
            entity.Property(x => x.ClientId).IsRequired();
            entity.Property(x => x.QuestionText)
                .HasMaxLength(2048)
                .IsRequired();
            entity.Property(x => x.QuestionType)
                .HasConversion<string>()
                .IsRequired();
            entity.Property(x => x.PredefinedOptions)
                .HasMaxLength(4096)
                .IsRequired(false);
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.TaskId);
            entity.HasIndex(x => x.GardenerId);
            entity.HasIndex(x => x.ClientId);
        });

        modelBuilder.Entity<TaskAnswerRecord>(entity =>
        {
            entity.ToTable("TaskAnswers");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.QuestionId).IsRequired();
            entity.Property(x => x.ClientId).IsRequired();
            entity.Property(x => x.AnswerText)
                .HasMaxLength(2048)
                .IsRequired();
            entity.Property(x => x.CreatedAtUtc).IsRequired();

            entity.HasIndex(x => x.QuestionId);
            entity.HasIndex(x => x.ClientId);
        });

        modelBuilder.Entity<TaskQuestionMediaRecord>(entity =>
        {
            entity.ToTable("TaskQuestionMedia");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.QuestionId).IsRequired();
            entity.Property(x => x.MediaUrl)
                .HasMaxLength(2048)
                .IsRequired();
            entity.Property(x => x.MediaType)
                .HasMaxLength(50)
                .IsRequired();
            entity.Property(x => x.FileName)
                .HasMaxLength(256)
                .IsRequired();
            entity.Property(x => x.UploadedAtUtc).IsRequired();

            entity.HasIndex(x => x.QuestionId);
        });

        modelBuilder.Entity<TaskAnswerMediaRecord>(entity =>
        {
            entity.ToTable("TaskAnswerMedia");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.AnswerId).IsRequired();
            entity.Property(x => x.MediaUrl)
                .HasMaxLength(2048)
                .IsRequired();
            entity.Property(x => x.MediaType)
                .HasMaxLength(50)
                .IsRequired();
            entity.Property(x => x.FileName)
                .HasMaxLength(256)
                .IsRequired();
            entity.Property(x => x.UploadedAtUtc).IsRequired();

            entity.HasIndex(x => x.AnswerId);
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
    public string? ExpoPushToken { get; set; }
}

public class ClientRecord
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string PasswordHash { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? LastLogoutUtc { get; set; }
    public string? ExpoPushToken { get; set; }
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

public class TaskScheduleRequestRecord
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid GardenerId { get; set; }
    public Guid ClientId { get; set; }
    public DateTime ScheduledAtUtc { get; set; }
    public DateTime? ProposedAtUtc { get; set; }
    public DateTime? ApprovedAtUtc { get; set; }
    public DateTime? DeclinedAtUtc { get; set; }
    public TaskScheduleStatus Status { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime UpdatedAtUtc { get; set; }
}

public enum TaskScheduleStatus
{
    Pending = 0,
    Approved = 1,
    Declined = 2,
    ProposedAlternative = 3,
    Rescheduled = 4,
    Cancelled = 5
}

public class TaskQuestionRecord
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public Guid GardenerId { get; set; }
    public Guid ClientId { get; set; }
    public string QuestionText { get; set; } = default!;
    public TaskQuestionType QuestionType { get; set; }
    public string? PredefinedOptions { get; set; }
    public DateTime CreatedAtUtc { get; set; }
}

public enum TaskQuestionType
{
    FreeText = 0,
    MultipleChoice = 1
}

public class TaskAnswerRecord
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public Guid ClientId { get; set; }
    public string AnswerText { get; set; } = default!;
    public DateTime CreatedAtUtc { get; set; }
}

public class TaskQuestionMediaRecord
{
    public Guid Id { get; set; }
    public Guid QuestionId { get; set; }
    public string MediaUrl { get; set; } = default!;
    public string MediaType { get; set; } = default!;
    public string FileName { get; set; } = default!;
    public DateTime UploadedAtUtc { get; set; }
}

public class TaskAnswerMediaRecord
{
    public Guid Id { get; set; }
    public Guid AnswerId { get; set; }
    public string MediaUrl { get; set; } = default!;
    public string MediaType { get; set; } = default!;
    public string FileName { get; set; } = default!;
    public DateTime UploadedAtUtc { get; set; }
}
