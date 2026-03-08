using Garden.Modules.Identity;

namespace Garden.Api.Tests.TestHelpers;

internal class FakeRefreshTokenService : IRefreshTokenService
{
    public string GenerateToken() => "fake-refresh-token";
}
