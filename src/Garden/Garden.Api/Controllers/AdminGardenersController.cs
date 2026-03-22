using System.Security.Claims;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Gardeners.Services;
using Garden.Modules.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Garden.Api.Dto;
using Garden.BuildingBlocks.Services;

namespace Garden.Api.Controllers;

[ApiController]
[Route("api/admin/gardeners")]
[Authorize(Roles = Roles.Admin)]
public class AdminGardenersController : ControllerBase
{
    private readonly GardenDbContext _dbContext;
    private readonly IGardenerRegistrationService _registrationService;

    public AdminGardenersController(GardenDbContext dbContext, IGardenerRegistrationService registrationService)
    {
        _dbContext = dbContext;
        _registrationService = registrationService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        var total = await _dbContext.Gardeners.CountAsync();

        var items = await _dbContext.Gardeners
            .OrderByDescending(g => g.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new AdminGardenerDto(
                GardenerId: g.Id,
                CompanyName: g.CompanyName,
                ContactName: g.Name,
                Email: g.Email,
                ClientsCount: _dbContext.GardenerClients.Count(gc => gc.GardenerId == g.Id),
                Clients: _dbContext.GardenerClients
                    .Where(gc => gc.GardenerId == g.Id)
                    .Join(
                        _dbContext.Clients,
                        gc => gc.ClientId,
                        c => c.Id,
                        (gc, c) => new AdminGardenerClientDto(
                            ClientId: c.Id,
                            FullName: c.Name,
                            Email: c.Email
                        )
                    )
                    .ToList(),
                CreatedAt: g.CreatedAtUtc
            ))
            .ToListAsync();

        return Ok(new PagedResult<AdminGardenerDto>(items, total, page, pageSize));
    }

    [HttpGet("total")]
    public async Task<IActionResult> GetNumberTotalGardners()
    {
        var total = await _dbContext.Gardeners.CountAsync();

        return Ok(new TotalNumberResponse(total));
    }


    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(g => g.Id == id);
        if (gardener == null) return NotFound();

        var clients = await _dbContext.GardenerClients
            .Where(gc => gc.GardenerId == id)
            .Join(
                _dbContext.Clients,
                gc => gc.ClientId,
                c => c.Id,
                (gc, c) => new AdminGardenerClientDto(
                    ClientId: c.Id,
                    FullName: c.Name,
                    Email: c.Email
                )
            )
            .ToListAsync();

        var dto = new AdminGardenerDto(
            GardenerId: gardener.Id,
            CompanyName: gardener.CompanyName,
            ContactName: gardener.Name,
            Email: gardener.Email,
            ClientsCount: clients.Count,
            Clients: clients,
            CreatedAt: gardener.CreatedAtUtc
        );

        return Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateGardenerRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.CompanyName))
            return BadRequest("Email, password and companyName are required.");
        try
        {
            var gardener = await _registrationService.RegisterAsync(request.Email, request.Password, request.CompanyName);

            // optional name
            if (!string.IsNullOrWhiteSpace(request.ContactName))
            {
                gardener.Name = request.ContactName.Trim();
                _dbContext.Gardeners.Update(gardener);
                await _dbContext.SaveChangesAsync();
            }

            var dto = new AdminGardenerDto(
                GardenerId: gardener.Id,
                CompanyName: gardener.CompanyName,
                ContactName: gardener.Name,
                Email: gardener.Email,
                ClientsCount: 0,
                Clients: new List<AdminGardenerClientDto>(),
                CreatedAt: gardener.CreatedAtUtc
            );

            return CreatedAtAction(nameof(GetById), new { id = dto.GardenerId }, dto);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx
            && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return Conflict("Email already in use.");
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateGardenerRequest request)
    {
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(g => g.Id == id);
        if (gardener == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.CompanyName)) gardener.CompanyName = request.CompanyName.Trim();
        if (!string.IsNullOrWhiteSpace(request.ContactName)) gardener.Name = request.ContactName.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalized = request.Email.Trim().ToLowerInvariant();

            var conflict = await _dbContext.Gardeners
                .AnyAsync(g => g.Email == normalized && g.Id != id);

            if (conflict)
                return Conflict("Email already in use.");

            gardener.Email = normalized;
        }

        // Update is not required for tracked entity but kept for clarity
        _dbContext.Gardeners.Update(gardener);

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx
            && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            // Unique constraint violation - return a friendly 409
            return Conflict("Email already in use.");
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(g => g.Id == id);
        if (gardener == null) return NotFound();

        _dbContext.Gardeners.Remove(gardener);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }

    /// <summary>
    /// Get all clients for a specific gardener
    /// </summary>
    [HttpGet("{id:guid}/clients")]
    public async Task<IActionResult> GetClients(Guid id)
    {
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(g => g.Id == id);
        if (gardener == null) return NotFound("Gardener not found");

        var clients = await _dbContext.GardenerClients
            .Where(gc => gc.GardenerId == id)
            .Join(
                _dbContext.Clients,
                gc => gc.ClientId,
                c => c.Id,
                (gc, c) => new AdminGardenerClientDto(
                    ClientId: c.Id,
                    FullName: c.Name,
                    Email: c.Email
                )
            )
            .ToListAsync();

        return Ok(new { gardenerId = id, gardenerEmail = gardener.Email, clientsCount = clients.Count, clients });
    }

    /// <summary>
    /// Get gardeners without any clients (unassigned gardeners)
    /// </summary>
    [HttpGet("without-clients")]
    public async Task<IActionResult> GetGardenersWithoutClients([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        var gardenersWithClients = await _dbContext.GardenerClients
            .Select(gc => gc.GardenerId)
            .Distinct()
            .ToListAsync();

        var withoutClientsQuery = _dbContext.Gardeners
            .Where(g => !gardenersWithClients.Contains(g.Id))
            .OrderByDescending(g => g.CreatedAtUtc);

        var total = await withoutClientsQuery.CountAsync();

        var items = await withoutClientsQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(g => new AdminGardenerDto(
                GardenerId: g.Id,
                CompanyName: g.CompanyName,
                ContactName: g.Name,
                Email: g.Email,
                ClientsCount: 0,
                Clients: new List<AdminGardenerClientDto>(),
                CreatedAt: g.CreatedAtUtc
            ))
            .ToListAsync();

        return Ok(new PagedResult<AdminGardenerDto>(items, total, page, pageSize));
    }
}

