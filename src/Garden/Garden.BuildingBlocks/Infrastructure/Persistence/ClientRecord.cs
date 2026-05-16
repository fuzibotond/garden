namespace Garden.BuildingBlocks.Infrastructure.Persistence;

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
