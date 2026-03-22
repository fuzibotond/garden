namespace Garden.Api.Dto
{
    /// <summary>
    /// Admin view of a client with relationship information
    /// </summary>
    public record AdminClientDto(
        Guid ClientId,
        string FullName,
        string Email,
        List<AdminClientGardenerDto> Gardeners,
        DateTime CreatedAt,
        string? InvitationStatus,
        DateTime? InvitationSentAt,
        DateTime? InvitationAcceptedAt,
        DateTime? InvitationExpiresAt
    );

    /// <summary>
    /// Gardener information for admin client view (relationship)
    /// </summary>
    public record AdminClientGardenerDto(
        Guid GardenerId,
        string CompanyName,
        string? ContactName
    );

    /// <summary>
    /// Admin view of a gardener with client relationships
    /// </summary>
    public record AdminGardenerDto(
        Guid GardenerId,
        string CompanyName,
        string? ContactName,
        string Email,
        int ClientsCount,
        List<AdminGardenerClientDto> Clients,
        DateTime CreatedAt
    );

    /// <summary>
    /// Client information for admin gardener view (relationship)
    /// </summary>
    public record AdminGardenerClientDto(
        Guid ClientId,
        string FullName,
        string Email
    );

    /// <summary>
    /// Admin overview of all relationships (clients mapped to gardeners)
    /// </summary>
    public record AdminRelationshipDto(
        Guid ClientId,
        string ClientName,
        string ClientEmail,
        Guid GardenerId,
        string GardenerCompanyName,
        string? GardenerContactName,
        string GardenerEmail
    );

    /// <summary>
    /// Admin dashboard statistics
    /// </summary>
    public record AdminDashboardStatsDto(
        int TotalGardeners,
        int TotalClients,
        int TotalRelationships,
        int GardenersWithClients,
        int GardenersWithoutClients,
        int ClientsWithGardeners,
        int ClientsWithoutGardeners
    );
}
