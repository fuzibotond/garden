using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;

namespace Garden.Modules.Materials.Features.Materials;

public class CreateMaterialHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public CreateMaterialHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<CreateMaterialResponse> Handle(CreateMaterialRequest request)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        var materialId = Guid.NewGuid();
        var now = DateTime.UtcNow;

        var material = new MaterialRecord
        {
            Id = materialId,
            GardenerId = userId.Value,
            Name = request.Name,
            Amount = request.Amount,
            AmountType = request.AmountType,
            PricePerAmount = request.PricePerAmount,
            CreatedAtUtc = now
        };

        _dbContext.Materials.Add(material);
        await _dbContext.SaveChangesAsync();

        return new CreateMaterialResponse
        {
            MaterialId = materialId,
            Name = request.Name,
            Amount = request.Amount,
            AmountType = request.AmountType,
            PricePerAmount = request.PricePerAmount,
            CreatedAt = now
        };
    }
}
