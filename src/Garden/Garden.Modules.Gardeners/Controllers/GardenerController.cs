using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Clients.Controllers;
using Garden.Modules.Clients.Services;
using Garden.Modules.Identity;

// no dependency on Identity types here
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Garden.Modules.Gardeners.Controllers;

[ApiController]
[Route("/api/gardener/clients")]
public class GardenerController : ControllerBase
{
    private readonly IInvitationService _invitationService;
    private readonly GardenDbContext _dbContext;
    private readonly ICurrentUser _currentUser;


    public GardenerController(IInvitationService invitationService, GardenDbContext dbContext, ICurrentUser currentUser)
    {
        _invitationService = invitationService;
        _dbContext = dbContext;
        _currentUser = currentUser;
    }

    // Gardener invites a client
    [HttpPost]
    [Route("invitations")]
    [Authorize(Roles = "Gardener")]
    public async Task<IActionResult> Invite([FromBody] InviteClientRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email)) return BadRequest("Email is required.");


        if (_currentUser == null || !_currentUser.IsAuthenticated || !_currentUser.Roles.Contains("Gardener"))
        {
            return Forbid();
        }
      
 
        try
        {
            if(_currentUser.UserId != null)
            {
                var invitation = await _invitationService.CreateInvitationAsync((Guid)_currentUser.UserId, request.Email);
                return CreatedAtAction(nameof(GetById), new { id = invitation.Id }, new { invitation.Id, invitation.Email, invitation.ExpiresAtUtc });
            }
            else
            {
                return Forbid();
            }
            
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("invitations/{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var inv = await _dbContext.Invitations.FirstOrDefaultAsync(i => i.Id == id);
        if (inv == null) return NotFound();
        return Ok(new { inv.Id, inv.Email, inv.GardenerId, inv.ExpiresAtUtc, inv.Status });
    }
   
    
    // Public: validate token and get invitation details (for signup page)
    [HttpGet("invitations/validate-token")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateToken([FromQuery] string token)
    {
        if (string.IsNullOrWhiteSpace(token)) return BadRequest("Token is required.");

        var invitation = await _invitationService.ValidateTokenAsync(token);
        if (invitation == null) return NotFound("Invalid or expired invitation token.");

        return Ok(new { 
            email = invitation.Email, 
            expiresAtUtc = invitation.ExpiresAtUtc,
            message = "Token is valid. Use this email to complete signup."
        });
    }

    // Public: accept invitation and create account
    [HttpPost("invitations/accept")]
    [AllowAnonymous]
    public async Task<IActionResult> AcceptInvitation([FromBody] AcceptInvitationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Token)) return BadRequest("Token is required.");
        if (string.IsNullOrWhiteSpace(request.Password) || string.IsNullOrWhiteSpace(request.ConfirmPassword))
            return BadRequest("Password and confirmPassword are required.");
        if (request.Password != request.ConfirmPassword) return BadRequest("Passwords do not match.");
        if (string.IsNullOrWhiteSpace(request.FullName)) return BadRequest("Full name is required.");

        try
        {
            var client = await _invitationService.AcceptInvitationAsync(request.Token, request.Password, request.FullName.Trim());
            return Created(string.Empty, new { 
                id = client.Id, 
                email = client.Email, 
                name = client.Name,
                message = "Account created successfully. You can now login."
            });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}

public record InviteClientRequest(string Email);
public record AcceptInvitationRequest(string Token, string Password, string ConfirmPassword, string? FullName);
