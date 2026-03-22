using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;

namespace Garden.Modules.Clients.Services;

public class InvitationService : IInvitationService
{
    private readonly GardenDbContext _dbContext;
    private readonly IPasswordHasher<ClientRecord> _passwordHasher;
    private readonly IEventPublisher _eventPublisher;

    public InvitationService(GardenDbContext dbContext, IPasswordHasher<ClientRecord> passwordHasher, IEventPublisher eventPublisher)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _eventPublisher = eventPublisher;
    }

    public async Task<InvitationRecord> CreateInvitationAsync(Guid gardenerId, string email, TimeSpan? ttl = null, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(email)) throw new ArgumentException("Email is required.");

        var normalized = email.Trim().ToLowerInvariant();
        ttl ??= TimeSpan.FromDays(7);

        // Generate secure token
        var token = GenerateToken();
        var tokenHash = Hash(token);

        var invitation = new InvitationRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardenerId,
            Email = normalized,
            TokenHash = tokenHash,
            ExpiresAtUtc = DateTime.UtcNow.Add(ttl.Value),
            Status = InvitationStatus.Pending,
            CreatedAtUtc = DateTime.UtcNow
        };

        // Create client record immediately with email as temporary name
        // Client will update their name when accepting the invitation
        var client = new ClientRecord
        {
            Id = Guid.NewGuid(),
            Email = normalized,
            Name = normalized,
            PasswordHash = string.Empty, // Will be set when client signs up
            CreatedAtUtc = DateTime.UtcNow
        };

        // Link gardener and client
        var link = new GardenerClientRecord
        {
            Id = Guid.NewGuid(),
            GardenerId = gardenerId,
            ClientId = client.Id
        };

        _dbContext.Invitations.Add(invitation);
        _dbContext.Clients.Add(client);
        _dbContext.GardenerClients.Add(link);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Publish event to send email (include raw token so the email sender can construct link)
        var @event = new InvitationCreatedEvent
        {
            GardenerId = gardenerId,
            Email = normalized,
            Token = token,
            ExpiresAtUtc = invitation.ExpiresAtUtc
        };

        await _eventPublisher.PublishAsync(@event, cancellationToken);

        return invitation;
    }

    public async Task<InvitationRecord?> ValidateTokenAsync(string token, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(token)) return null;
        var tokenHash = Hash(token);

        var invitation = await _dbContext.Invitations.FirstOrDefaultAsync(i => i.TokenHash == tokenHash, cancellationToken);
        if (invitation == null) return null;

        if (invitation.Status != InvitationStatus.Pending) return null;
        if (invitation.ExpiresAtUtc < DateTime.UtcNow)
        {
            // mark expired
            invitation.Status = InvitationStatus.Expired;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return null;
        }

        return invitation;
    }

    public async Task<ClientRecord> AcceptInvitationAsync(string token, string password, string fullName, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(password)) throw new ArgumentException("Password is required.");
        if (string.IsNullOrWhiteSpace(fullName)) throw new ArgumentException("Full name is required.");

        var invitation = await ValidateTokenAsync(token, cancellationToken);
        if (invitation == null) throw new InvalidOperationException("Invalid or expired invitation.");

        // Get the existing client that was created during invitation
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Email == invitation.Email, cancellationToken);
        if (client == null) throw new InvalidOperationException("Client not found. This should not happen.");

        // Update client with proper name and password
        client.Name = fullName.Trim();
        client.PasswordHash = _passwordHasher.HashPassword(client, password);

        // Mark invitation accepted
        invitation.Status = InvitationStatus.Accepted;
        invitation.AcceptedAtUtc = DateTime.UtcNow;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return client;
    }

    private static string GenerateToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string Hash(string token)
    {
        using var sha = SHA256.Create();
        var bytes = Encoding.UTF8.GetBytes(token);
        var hash = sha.ComputeHash(bytes);
        return Convert.ToHexString(hash);
    }
}

public record InvitationCreatedEvent
{
    public Guid GardenerId { get; init; }
    public string Email { get; init; } = default!;
    public string Token { get; init; } = default!;
    public DateTime ExpiresAtUtc { get; init; }
}
