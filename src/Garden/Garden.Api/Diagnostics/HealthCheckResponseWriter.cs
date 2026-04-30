using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace Garden.Api.Diagnostics;

internal static class HealthCheckResponseWriter
{
    private static readonly JsonSerializerOptions SerializerOptions = new(JsonSerializerDefaults.Web)
    {
        WriteIndented = true
    };

    public static async Task WriteAsync(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";

        var payload = new
        {
            status = report.Status.ToString().ToLowerInvariant(),
            duration = report.TotalDuration,
            checks = report.Entries.ToDictionary(
                entry => entry.Key,
                entry => new
                {
                    status = entry.Value.Status.ToString().ToLowerInvariant(),
                    description = entry.Value.Description,
                    duration = entry.Value.Duration,
                    error = entry.Value.Exception?.Message,
                    tags = entry.Value.Tags
                })
        };

        await context.Response.WriteAsync(JsonSerializer.Serialize(payload, SerializerOptions));
    }
}