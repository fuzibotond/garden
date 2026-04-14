using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;

namespace Garden.Modules.Materials.Features.Materials;

public class UpdateMaterialHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public UpdateMaterialHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetMaterialResponse?> Handle(UpdateMaterialRequest request)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        var material = await _dbContext.Materials.FindAsync(request.MaterialId);
        if (material == null || material.GardenerId != userId.Value)
            return null;

        if (!string.IsNullOrEmpty(request.Name))
            material.Name = request.Name;

        if (!string.IsNullOrEmpty(request.AmountType))
            material.AmountType = request.AmountType;

        if (request.PricePerAmount.HasValue && request.PricePerAmount.Value >= 0)
            material.PricePerAmount = request.PricePerAmount.Value;

        await _dbContext.SaveChangesAsync();

        return new GetMaterialResponse
        {
            MaterialId = material.Id,
            Name = material.Name,
            AmountType = material.AmountType,
            PricePerAmount = material.PricePerAmount,
            CreatedAt = material.CreatedAtUtc
        };
    }
}
