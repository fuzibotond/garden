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
            .Select(g => new AdminGardenerDto
            {
                GardenerId = g.Id,
                CompanyName = g.CompanyName,
                ContactName = g.Name,
                Email = g.Email,
                CreatedAt = g.CreatedAtUtc,
                ClientsCount = 0,
                JobsCount = 0
            })
            .ToListAsync();

        return Ok(new PagedResult<AdminGardenerDto>(items, total, page, pageSize));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var gardener = await _dbContext.Gardeners.FirstOrDefaultAsync(g => g.Id == id);
        if (gardener == null) return NotFound();

        var dto = new AdminGardenerDto
        {
            GardenerId = gardener.Id,
            CompanyName = gardener.CompanyName,
            ContactName = gardener.Name,
            Email = gardener.Email,
            CreatedAt = gardener.CreatedAtUtc,
            ClientsCount = 0,
            JobsCount = 0
        };

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

            var dto = new AdminGardenerDto
            {
                GardenerId = gardener.Id,
                CompanyName = gardener.CompanyName,
                ContactName = gardener.Name,
                Email = gardener.Email,
                CreatedAt = gardener.CreatedAtUtc,
                ClientsCount = 0,
                JobsCount = 0
            };

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
}

public record AdminGardenerDto
{
    public Guid GardenerId { get; init; }
    public string CompanyName { get; init; } = default!;
    public string? ContactName { get; init; }
    public string Email { get; init; } = default!;
    public DateTime CreatedAt { get; init; }
    public int ClientsCount { get; init; }
    public int JobsCount { get; init; }
}

