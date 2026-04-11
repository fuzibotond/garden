namespace Garden.Modules.Scheduling.Features.Jobs;

public record GetJobsResponse
{
    public List<JobItemDto> Jobs { get; init; } = [];
    public int Total { get; init; }
}

public record JobItemDto
{
    public Guid JobId { get; init; }
    public string Name { get; init; } = default!;
    public ClientDto Client { get; init; } = default!;
    public List<GardenerDto> LinkedGardeners { get; init; } = [];
    public int TaskCount { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record ClientDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public string Email { get; init; } = default!;
}

public record GardenerDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = default!;
    public string Email { get; init; } = default!;
}

