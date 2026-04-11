using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;

namespace Garden.Modules.Materials.Features.Materials;

public class GetMaterialHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetMaterialHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetMaterialResponse?> Handle(Guid materialId)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        var material = await _dbContext.Materials.FindAsync(materialId);
        if (material == null || material.GardenerId != userId.Value)
            return null;

        return new GetMaterialResponse
        {
            MaterialId = material.Id,
            Name = material.Name,
            Amount = material.Amount,
            AmountType = material.AmountType,
            PricePerAmount = material.PricePerAmount,
            CreatedAt = material.CreatedAtUtc
        };
    }
}
