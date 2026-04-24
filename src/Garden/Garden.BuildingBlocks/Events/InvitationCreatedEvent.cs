namespace Garden.BuildingBlocks.Events;

/// <summary>
/// Event published when a client invitation is created.
/// </summary>
public record InvitationCreatedEvent
{
    public Guid GardenerId { get; init; }
    public string Email { get; init; } = default!;
    public string Token { get; init; } = default!;
    public DateTime ExpiresAtUtc { get; init; }
}
