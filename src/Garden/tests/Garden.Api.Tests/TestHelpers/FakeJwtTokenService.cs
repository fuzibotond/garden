using Garden.Modules.Identity;
using System.Collections.Generic;

namespace Garden.Api.Tests.TestHelpers;

internal class FakeJwtTokenService : IJwtTokenService
{
    public string GenerateToken(Guid userId, string email, IEnumerable<string> roles) => "fake-jwt-token";
}
