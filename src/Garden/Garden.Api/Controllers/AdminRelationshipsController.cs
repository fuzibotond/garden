using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Identity;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Garden.Api.Dto;

namespace Garden.Api.Controllers;

/// <summary>
/// Admin endpoints for viewing and managing client-gardener relationships
/// </summary>
[ApiController]
[Route("api/admin/relationships")]
[Authorize(Roles = Roles.Admin)]
public class AdminRelationshipsController : ControllerBase
{
    private readonly GardenDbContext _dbContext;

    public AdminRelationshipsController(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    /// <summary>
    /// Get all client-gardener relationships with pagination
    /// Shows all connections between clients and gardeners
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAllRelationships([FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 200) pageSize = 50;

        var total = await _dbContext.GardenerClients.CountAsync();

        var items = await _dbContext.GardenerClients
            .OrderByDescending(gc => gc.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(
                _dbContext.Clients,
                gc => gc.ClientId,
                c => c.Id,
                (gc, c) => new { gc, c }
            )
            .Join(
                _dbContext.Gardeners,
                temp => temp.gc.GardenerId,
                g => g.Id,
                (temp, g) => new AdminRelationshipDto(
                    ClientId: temp.c.Id,
                    ClientName: temp.c.Name,
                    ClientEmail: temp.c.Email,
                    GardenerId: g.Id,
                    GardenerCompanyName: g.CompanyName,
                    GardenerContactName: g.Name,
                    GardenerEmail: g.Email
                )
            )
            .ToListAsync();

        return Ok(new PagedResult<AdminRelationshipDto>(items, total, page, pageSize));
    }

    /// <summary>
    /// Get relationships filtered by gardener
    /// Shows all clients connected to a specific gardener
    /// </summary>
    [HttpGet("gardeners/{gardenerId:guid}")]
    public async Task<IActionResult> GetRelationshipsByGardener(Guid gardenerId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(g => g.Id == gardenerId);
        if (gardener == null) return NotFound("Gardener not found");

        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 200) pageSize = 50;

        var total = await _dbContext.GardenerClients
            .Where(gc => gc.GardenerId == gardenerId)
            .CountAsync();

        var items = await _dbContext.GardenerClients
            .Where(gc => gc.GardenerId == gardenerId)
            .OrderByDescending(gc => gc.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(
                _dbContext.Clients,
                gc => gc.ClientId,
                c => c.Id,
                (gc, c) => new AdminRelationshipDto(
                    ClientId: c.Id,
                    ClientName: c.Name,
                    ClientEmail: c.Email,
                    GardenerId: gardener.Id,
                    GardenerCompanyName: gardener.CompanyName,
                    GardenerContactName: gardener.Name,
                    GardenerEmail: gardener.Email
                )
            )
            .ToListAsync();

        return Ok(new
        {
            gardener = new { gardenerId = gardener.Id, companyName = gardener.CompanyName, contactName = gardener.Name, email = gardener.Email },
            relationships = new PagedResult<AdminRelationshipDto>(items, total, page, pageSize)
        });
    }

    /// <summary>
    /// Get relationships filtered by client
    /// Shows all gardeners connected to a specific client
    /// </summary>
    [HttpGet("clients/{clientId:guid}")]
    public async Task<IActionResult> GetRelationshipsByClient(Guid clientId, [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == clientId);
        if (client == null) return NotFound("Client not found");

        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 200) pageSize = 50;

        var total = await _dbContext.GardenerClients
            .Where(gc => gc.ClientId == clientId)
            .CountAsync();

        var items = await _dbContext.GardenerClients
            .Where(gc => gc.ClientId == clientId)
            .OrderByDescending(gc => gc.Id)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(
                _dbContext.Gardeners,
                gc => gc.GardenerId,
                g => g.Id,
                (gc, g) => new AdminRelationshipDto(
                    ClientId: client.Id,
                    ClientName: client.Name,
                    ClientEmail: client.Email,
                    GardenerId: g.Id,
                    GardenerCompanyName: g.CompanyName,
                    GardenerContactName: g.Name,
                    GardenerEmail: g.Email
                )
            )
            .ToListAsync();

        return Ok(new
        {
            client = new { clientId = client.Id, name = client.Name, email = client.Email },
            relationships = new PagedResult<AdminRelationshipDto>(items, total, page, pageSize)
        });
    }

    /// <summary>
    /// Get dashboard statistics about client-gardener relationships
    /// Shows overall system metrics
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetDashboardStats()
    {
        var totalGardeners = await _dbContext.Gardeners.CountAsync();
        var totalClients = await _dbContext.Clients.CountAsync();
        var totalRelationships = await _dbContext.GardenerClients.CountAsync();

        var gardenersWithClients = await _dbContext.GardenerClients
            .Select(gc => gc.GardenerId)
            .Distinct()
            .CountAsync();

        var clientsWithGardeners = await _dbContext.GardenerClients
            .Select(gc => gc.ClientId)
            .Distinct()
            .CountAsync();

        var dto = new AdminDashboardStatsDto(
            TotalGardeners: totalGardeners,
            TotalClients: totalClients,
            TotalRelationships: totalRelationships,
            GardenersWithClients: gardenersWithClients,
            GardenersWithoutClients: totalGardeners - gardenersWithClients,
            ClientsWithGardeners: clientsWithGardeners,
            ClientsWithoutGardeners: totalClients - clientsWithGardeners
        );

        return Ok(dto);
    }

    /// <summary>
    /// Create a relationship (link client to gardener)
    /// </summary>
    [HttpPost("create")]
    public async Task<IActionResult> CreateRelationship([FromBody] CreateRelationshipRequest request)
    {
        if (request.ClientId == Guid.Empty || request.GardenerId == Guid.Empty)
            return BadRequest("ClientId and GardenerId are required");

        var clientExists = await _dbContext.Clients.AnyAsync(c => c.Id == request.ClientId);
        if (!clientExists) return NotFound("Client not found");

        var gardenerExists = await _dbContext.Gardeners.AnyAsync(g => g.Id == request.GardenerId);
        if (!gardenerExists) return NotFound("Gardener not found");

        var alreadyLinked = await _dbContext.GardenerClients
            .AnyAsync(gc => gc.ClientId == request.ClientId && gc.GardenerId == request.GardenerId);
        if (alreadyLinked) return Conflict("This client is already linked to this gardener");

        var link = new GardenerClientRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = request.GardenerId,
            ClientId = request.ClientId
        };

        _dbContext.GardenerClients.Add(link);
        await _dbContext.SaveChangesAsync();

        var client = await _dbContext.Clients.FirstAsync(c => c.Id == request.ClientId);
        var gardener = await _dbContext.Gardeners.FirstAsync(g => g.Id == request.GardenerId);

        var dto = new AdminRelationshipDto(
            ClientId: client.Id,
            ClientName: client.Name,
            ClientEmail: client.Email,
            GardenerId: gardener.Id,
            GardenerCompanyName: gardener.CompanyName,
            GardenerContactName: gardener.Name,
            GardenerEmail: gardener.Email
        );

        return CreatedAtAction(nameof(GetAllRelationships), dto);
    }

    /// <summary>
    /// Delete a relationship (unlink client from gardener)
    /// </summary>
    [HttpDelete("{clientId:guid}/{gardenerId:guid}")]
    public async Task<IActionResult> DeleteRelationship(Guid clientId, Guid gardenerId)
    {
        var link = await _dbContext.GardenerClients
            .FirstOrDefaultAsync(gc => gc.ClientId == clientId && gc.GardenerId == gardenerId);

        if (link == null) return NotFound("Relationship not found");

        _dbContext.GardenerClients.Remove(link);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}

/// <summary>
/// Request to create a new relationship
/// </summary>
public record CreateRelationshipRequest(Guid ClientId, Guid GardenerId);
