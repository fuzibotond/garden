public class RefreshTokenRecord
{
    public Guid Id { get; set; }
    public Guid GardenerId { get; set; }
    public string Token { get; set; } = default!;
    public DateTime ExpiresAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public DateTime? RevokedAtUtc { get; set; }
}