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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<GardenerRecord>(entity =>
        {
            entity.ToTable("Gardeners");
            entity.HasKey(x => x.Id);

            entity.Property(x => x.Email)
                .HasMaxLength(256)
                .IsRequired();

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

            entity.HasIndex(x => x.Email).IsUnique();
        });
    }
}

public class GardenerRecord
{
    public Guid Id { get; set; }
    public string Email { get; set; } = default!;
    public string CompanyName { get; set; } = default!;
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
}
