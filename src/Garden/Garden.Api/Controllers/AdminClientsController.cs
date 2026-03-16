using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Clients.Services;
using Garden.Modules.Identity;
using Microsoft.Data.SqlClient;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Garden.Api.Dto;

namespace Garden.Api.Controllers;

[ApiController]
[Route("api/admin/clients")]
[Authorize(Roles = Roles.Admin)]
public class AdminClientsController : ControllerBase
{
    private readonly GardenDbContext _dbContext;
    private readonly IClientService _clientService;

    public AdminClientsController(GardenDbContext dbContext, IClientService clientService)
    {
        _dbContext = dbContext;
        _clientService = clientService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        var total = await _dbContext.Clients.CountAsync();

        var items = await _dbContext.Clients
            .OrderByDescending(c => c.CreatedAtUtc)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new AdminClientDto
            {
                ClientId = c.Id,
                FullName = c.Name,
                Email = c.Email,
                GardenerId = null,
                GardenerName = null,
                CreatedAt = c.CreatedAtUtc
            })
            .ToListAsync();

        return Ok(new PagedResult<AdminClientDto>(items, total, page, pageSize));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == id);
        if (client == null) return NotFound();

        var dto = new AdminClientDto
        {
            ClientId = client.Id,
            FullName = client.Name,
            Email = client.Email,
            GardenerId = null,
            GardenerName = null,
            CreatedAt = client.CreatedAtUtc
        };

        return Ok(dto);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateClientRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.FullName))
            return BadRequest("Email and fullName are required.");

        var initialPassword = request.Password ?? Guid.NewGuid().ToString("N").Substring(0, 12);
        try
        {
            var client = await _clientService.CreateClientAsync(request.Email, request.FullName, initialPassword);

            var dto = new AdminClientDto
            {
                ClientId = client.Id,
                FullName = client.Name,
                Email = client.Email,
                GardenerId = null,
                GardenerName = null,
                CreatedAt = client.CreatedAtUtc
            };

            return CreatedAtAction(nameof(GetById), new { id = dto.ClientId }, dto);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, UpdateClientRequest request)
    {
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == id);
        if (client == null) return NotFound();

        if (!string.IsNullOrWhiteSpace(request.FullName))
            client.Name = request.FullName.Trim();

        if (!string.IsNullOrWhiteSpace(request.Email))
        {
            var normalized = request.Email.Trim().ToLowerInvariant();
            var exists = await _dbContext.Clients
                .AnyAsync(c => c.Email == normalized && c.Id != id);

            if (exists) return Conflict("A client with this email already exists.");

            client.Email = normalized;
        }

        try
        {
            await _dbContext.SaveChangesAsync();
        }
        catch (DbUpdateException ex) when (ex.InnerException is SqlException sqlEx
            && (sqlEx.Number == 2601 || sqlEx.Number == 2627))
        {
            return Conflict("A client with this email already exists.");
        }

        return NoContent();
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == id);
        if (client == null) return NotFound();

        _dbContext.Clients.Remove(client);
        await _dbContext.SaveChangesAsync();

        return NoContent();
    }
}

public record AdminClientDto
{
    public Guid ClientId { get; init; }
    public string FullName { get; init; } = default!;
    public string Email { get; init; } = default!;
    public Guid? GardenerId { get; init; }
    public string? GardenerName { get; init; }
    public DateTime CreatedAt { get; init; }
}

