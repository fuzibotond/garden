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
            .Select(c => new AdminClientDto(
                ClientId: c.Id,
                FullName: c.Name,
                Email: c.Email,
                Gardeners: _dbContext.GardenerClients
                    .Where(gc => gc.ClientId == c.Id)
                    .Join(
                        _dbContext.Gardeners,
                        gc => gc.GardenerId,
                        g => g.Id,
                        (gc, g) => new AdminClientGardenerDto(
                            GardenerId: g.Id,
                            CompanyName: g.CompanyName,
                            ContactName: g.Name
                        )
                    )
                    .ToList(),
                CreatedAt: c.CreatedAtUtc,
                InvitationStatus: _dbContext.Invitations
                    .Where(i => i.Email == c.Email)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => i.Status.ToString())
                    .FirstOrDefault(),
                InvitationSentAt: _dbContext.Invitations
                    .Where(i => i.Email == c.Email)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => (DateTime?)i.CreatedAtUtc)
                    .FirstOrDefault(),
                InvitationAcceptedAt: _dbContext.Invitations
                    .Where(i => i.Email == c.Email)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => i.AcceptedAtUtc)
                    .FirstOrDefault(),
                InvitationExpiresAt: _dbContext.Invitations
                    .Where(i => i.Email == c.Email)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => (DateTime?)i.ExpiresAtUtc)
                    .FirstOrDefault()
            ))
            .ToListAsync();

        return Ok(new PagedResult<AdminClientDto>(items, total, page, pageSize));
    }

    [HttpGet("total")]
    public async Task<IActionResult> GetNumberTotalClients()
    {
        var total = await _dbContext.Clients.CountAsync();


        return Ok(new TotalNumberResponse(total));
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == id);
        if (client == null) return NotFound();

        var gardeners = await _dbContext.GardenerClients
            .Where(gc => gc.ClientId == id)
            .Join(
                _dbContext.Gardeners,
                gc => gc.GardenerId,
                g => g.Id,
                (gc, g) => new AdminClientGardenerDto(
                    GardenerId: g.Id,
                    CompanyName: g.CompanyName,
                    ContactName: g.Name
                )
            )
            .ToListAsync();

        var invitation = await _dbContext.Invitations
            .Where(i => i.Email == client.Email)
            .OrderByDescending(i => i.CreatedAtUtc)
            .FirstOrDefaultAsync();

        var dto = new AdminClientDto(
            ClientId: client.Id,
            FullName: client.Name,
            Email: client.Email,
            Gardeners: gardeners,
            CreatedAt: client.CreatedAtUtc,
            InvitationStatus: invitation?.Status.ToString(),
            InvitationSentAt: invitation?.CreatedAtUtc,
            InvitationAcceptedAt: invitation?.AcceptedAtUtc,
            InvitationExpiresAt: invitation?.ExpiresAtUtc
        );

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

            var dto = new AdminClientDto(
                ClientId: client.Id,
                FullName: client.Name,
                Email: client.Email,
                Gardeners: new List<AdminClientGardenerDto>(),
                CreatedAt: client.CreatedAtUtc,
                InvitationStatus: null,
                InvitationSentAt: null,
                InvitationAcceptedAt: null,
                InvitationExpiresAt: null
            );

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

    /// <summary>
    /// Get all gardeners for a specific client
    /// </summary>
    [HttpGet("{id:guid}/gardeners")]
    public async Task<IActionResult> GetGardeners(Guid id)
    {
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Id == id);
        if (client == null) return NotFound("Client not found");

        var gardeners = await _dbContext.GardenerClients
            .Where(gc => gc.ClientId == id)
            .Join(
                _dbContext.Gardeners,
                gc => gc.GardenerId,
                g => g.Id,
                (gc, g) => new AdminClientGardenerDto(
                    GardenerId: g.Id,
                    CompanyName: g.CompanyName,
                    ContactName: g.Name
                )
            )
            .ToListAsync();

        return Ok(new { clientId = id, clientEmail = client.Email, gardeners });
    }

    /// <summary>
    /// Get clients without any gardeners (unassigned clients)
    /// </summary>
    [HttpGet("unassigned")]
    public async Task<IActionResult> GetUnassignedClients([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        if (page <= 0) page = 1;
        if (pageSize <= 0 || pageSize > 100) pageSize = 20;

        var clientsWithRelationships = await _dbContext.GardenerClients
            .Select(gc => gc.ClientId)
            .Distinct()
            .ToListAsync();

        var unassignedQuery = _dbContext.Clients
            .Where(c => !clientsWithRelationships.Contains(c.Id))
            .OrderByDescending(c => c.CreatedAtUtc);

        var total = await unassignedQuery.CountAsync();

        var items = await unassignedQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new AdminClientDto(
                ClientId: c.Id,
                FullName: c.Name,
                Email: c.Email,
                Gardeners: new List<AdminClientGardenerDto>(),
                CreatedAt: c.CreatedAtUtc,
                InvitationStatus: _dbContext.Invitations
                    .Where(i => i.Email == c.Email)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => i.Status.ToString())
                    .FirstOrDefault(),
                InvitationSentAt: _dbContext.Invitations
                    .Where(i => i.Email == c.Email)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => (DateTime?)i.CreatedAtUtc)
                    .FirstOrDefault(),
                InvitationAcceptedAt: _dbContext.Invitations
                    .Where(i => i.Email == c.Email)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => i.AcceptedAtUtc)
                    .FirstOrDefault(),
                InvitationExpiresAt: _dbContext.Invitations
                    .Where(i => i.Email == c.Email)
                    .OrderByDescending(i => i.CreatedAtUtc)
                    .Select(i => (DateTime?)i.ExpiresAtUtc)
                    .FirstOrDefault()
            ))
            .ToListAsync();

        return Ok(new PagedResult<AdminClientDto>(items, total, page, pageSize));
    }
}

