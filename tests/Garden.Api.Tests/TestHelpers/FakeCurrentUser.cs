using Garden.Modules.Identity;

namespace Garden.Api.Tests.TestHelpers;

internal class FakeCurrentUser : ICurrentUser
{
    public Guid? UserId { get; set; }
    public string? Email { get; set; }
    public bool IsAuthenticated { get; set; }
    public IReadOnlyCollection<string> Roles { get; set; } = Array.Empty<string>();
    public DateTime? IssuedAtUtc { get; set; }
}
