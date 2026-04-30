using Garden.BuildingBlocks.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Garden.Api.Diagnostics;

internal sealed class GardenDbHealthCheck : IHealthCheck
{
    private readonly GardenDbContext _dbContext;

    public GardenDbHealthCheck(GardenDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var canConnect = await _dbContext.Database.CanConnectAsync(cancellationToken);

            return canConnect
                ? HealthCheckResult.Healthy("SQL Server connection succeeded.")
                : HealthCheckResult.Unhealthy("SQL Server connection failed.");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy("SQL Server connection failed.", exception);
        }
    }
}