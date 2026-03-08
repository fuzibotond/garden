using Garden.Modules.Identity;

namespace Garden.Api.Tests.TestHelpers;

internal class FakeCurrentUser : ICurrentUser
{
    public Guid? UserId { get; set; }
    public string? Email { get; set; }
    public bool IsAuthenticated { get; set; }
}
