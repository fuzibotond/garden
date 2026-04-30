using System.Net.Sockets;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Garden.Api.Diagnostics;

internal sealed class RabbitMqTcpHealthCheck : IHealthCheck
{
    private readonly IConfiguration _configuration;

    public RabbitMqTcpHealthCheck(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        var host = _configuration["RabbitMq:HostName"] ?? "localhost";
        var port = int.TryParse(_configuration["RabbitMq:Port"], out var configuredPort)
            ? configuredPort
            : 5672;

        try
        {
            using var client = new TcpClient();
            await client.ConnectAsync(host, port, cancellationToken);

            return HealthCheckResult.Healthy($"RabbitMQ reachable at {host}:{port}.");
        }
        catch (Exception exception)
        {
            return HealthCheckResult.Unhealthy($"RabbitMQ unreachable at {host}:{port}.", exception);
        }
    }
}