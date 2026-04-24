using Microsoft.Extensions.Logging;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Garden.Modules.Notifications.Services;

public class ExpoPushNotificationService : IExpoPushNotificationService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ExpoPushNotificationService> _logger;
    private const string ExpoApiUrl = "https://exp.host/--/api/v2/push/send";

    public ExpoPushNotificationService(
        IHttpClientFactory httpClientFactory,
        ILogger<ExpoPushNotificationService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    public async Task SendPushNotificationAsync(
        string expoPushToken,
        string title,
        string body,
        object? data = null,
        CancellationToken cancellationToken = default)
    {
        await SendPushNotificationsAsync([expoPushToken], title, body, data, cancellationToken);
    }

    public async Task SendPushNotificationsAsync(
        IEnumerable<string> expoPushTokens,
        string title,
        string body,
        object? data = null,
        CancellationToken cancellationToken = default)
    {
        var tokens = expoPushTokens.Where(t => !string.IsNullOrWhiteSpace(t)).ToList();
        
        if (!tokens.Any())
        {
            _logger.LogWarning("No valid Expo push tokens provided");
            return;
        }

        var messages = tokens.Select(token => new ExpoPushMessage
        {
            To = token,
            Title = title,
            Body = body,
            Data = data,
            Sound = "default",
            Priority = "high"
        }).ToList();

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            var json = JsonSerializer.Serialize(messages, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            });

            var content = new StringContent(json, Encoding.UTF8, "application/json");
            var response = await httpClient.PostAsync(ExpoApiUrl, content, cancellationToken);

            if (response.IsSuccessStatusCode)
            {
                var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogInformation("Push notifications sent successfully to {Count} devices. Response: {Response}",
                    tokens.Count, responseBody);
            }
            else
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                _logger.LogError("Failed to send push notifications. Status: {StatusCode}, Response: {Response}",
                    response.StatusCode, errorBody);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending push notifications to {Count} devices", tokens.Count);
        }
    }

    private class ExpoPushMessage
    {
        [JsonPropertyName("to")]
        public string To { get; set; } = default!;

        [JsonPropertyName("title")]
        public string Title { get; set; } = default!;

        [JsonPropertyName("body")]
        public string Body { get; set; } = default!;

        [JsonPropertyName("data")]
        public object? Data { get; set; }

        [JsonPropertyName("sound")]
        public string Sound { get; set; } = "default";

        [JsonPropertyName("priority")]
        public string Priority { get; set; } = "high";
    }
}
