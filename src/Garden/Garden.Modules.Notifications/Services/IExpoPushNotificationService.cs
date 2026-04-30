namespace Garden.Modules.Notifications.Services;

public interface IExpoPushNotificationService
{
    Task SendPushNotificationAsync(string expoPushToken, string title, string body, object? data = null, CancellationToken cancellationToken = default);
    Task SendPushNotificationsAsync(IEnumerable<string> expoPushTokens, string title, string body, object? data = null, CancellationToken cancellationToken = default);
}
