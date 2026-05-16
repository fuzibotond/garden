using System;
using System.Collections.Generic;

namespace Garden.BuildingBlocks.Services;

public interface ICurrentUser
{
    bool IsAuthenticated { get; }
    Guid? UserId { get; }
    string? Email { get; }
    DateTime? IssuedAtUtc { get; }
    IReadOnlyCollection<string> Roles { get; }
}
