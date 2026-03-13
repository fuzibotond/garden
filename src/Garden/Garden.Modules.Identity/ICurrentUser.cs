namespace Garden.Modules.Identity;

public interface ICurrentUser
{
    Guid? UserId { get; }
    string? Email { get; }
    bool IsAuthenticated { get; }
    IReadOnlyCollection<string> Roles { get; }
    DateTime? IssuedAtUtc { get; }
}