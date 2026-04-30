using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Materials.Features.Materials;

public class GetMaterialsHandler
{
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;

    public GetMaterialsHandler(GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    public async Task<GetMaterialsResponse> Handle(int page = 1, int pageSize = 20)
    {
        var userId = _currentUser.UserId;
        if (!userId.HasValue || userId == Guid.Empty)
        {
            throw new UnauthorizedAccessException("User not authenticated");
        }

        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        var total = await _dbContext.Materials.CountAsync(m => m.GardenerId == userId.Value);

        var materials = await _dbContext.Materials
            .Where(m => m.GardenerId == userId.Value)
            .OrderByDescending(m => m.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(m => new MaterialItemDto
            {
                MaterialId = m.Id,
                Name = m.Name,
                AmountType = m.AmountType,
                PricePerAmount = m.PricePerAmount
            })
            .ToListAsync();

        return new GetMaterialsResponse
        {
            Materials = materials,
            Total = total
        };
    }
}
