using Garden.Modules.Identity;

namespace Garden.Api.Tests.TestHelpers;

internal class FakeJwtTokenService : IJwtTokenService
{
    public string GenerateToken(Guid userId, string email) => "fake-jwt-token";
}
