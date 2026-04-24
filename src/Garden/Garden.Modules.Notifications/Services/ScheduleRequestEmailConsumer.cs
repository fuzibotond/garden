using Garden.BuildingBlocks.Events;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace Garden.Modules.Notifications.Services;

/// <summary>
/// Background service that consumes ScheduleRequestCreatedEvent from RabbitMQ
/// and sends notification emails and push notifications to clients.
/// </summary>
public sealed class ScheduleRequestEmailConsumer : BackgroundService
{
    private readonly RabbitMqOptions _rabbitOptions;
    private readonly IEmailService _emailService;
    private readonly IExpoPushNotificationService _pushNotificationService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduleRequestEmailConsumer> _logger;

    private IConnection? _connection;
    private IChannel? _channel;

    private const string QueueName = "schedule-requests.email.queue";
    private const string ExchangeName = "garden.events";
    private const string RoutingKey = "schedulerequestcreatedevent";

    public ScheduleRequestEmailConsumer(
        RabbitMqOptions rabbitOptions,
        IEmailService emailService,
        IExpoPushNotificationService pushNotificationService,
        IServiceScopeFactory scopeFactory,
        ILogger<ScheduleRequestEmailConsumer> logger)
    {
        _rabbitOptions = rabbitOptions ?? throw new ArgumentNullException(nameof(rabbitOptions));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _pushNotificationService = pushNotificationService ?? throw new ArgumentNullException(nameof(pushNotificationService));
        _scopeFactory = scopeFactory ?? throw new ArgumentNullException(nameof(scopeFactory));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await InitializeRabbitMqAsync(stoppingToken);
            await ConsumeMessagesAsync(stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("ScheduleRequestEmailConsumer is stopping");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ScheduleRequestEmailConsumer encountered an error");
            throw;
        }
    }

    private async Task InitializeRabbitMqAsync(CancellationToken cancellationToken)
    {
        try
        {
            var factory = new ConnectionFactory
            {
                HostName = _rabbitOptions.HostName,
                Port = _rabbitOptions.Port,
                UserName = _rabbitOptions.UserName,
                Password = _rabbitOptions.Password
            };

            _connection = await factory.CreateConnectionAsync(cancellationToken);
            _channel = await _connection.CreateChannelAsync(cancellationToken: cancellationToken);

            // Declare exchange
            await _channel.ExchangeDeclareAsync(
                ExchangeName,
                ExchangeType.Topic,
                durable: true,
                autoDelete: false,
                cancellationToken: cancellationToken);

            // Declare queue
            await _channel.QueueDeclareAsync(
                QueueName,
                durable: true,
                exclusive: false,
                autoDelete: false,
                cancellationToken: cancellationToken);

            // Bind queue to exchange with routing key
            await _channel.QueueBindAsync(
                QueueName,
                ExchangeName,
                RoutingKey,
                cancellationToken: cancellationToken);

            // Set QoS to process one message at a time
            await _channel.BasicQosAsync(0, 1, false, cancellationToken);

            _logger.LogInformation("ScheduleRequestEmailConsumer initialized: listening on queue '{QueueName}' with routing key '{RoutingKey}'",
                QueueName, RoutingKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize RabbitMQ connection");
            throw;
        }
    }

    private async Task ConsumeMessagesAsync(CancellationToken stoppingToken)
    {
        if (_channel is null)
            throw new InvalidOperationException("Channel not initialized");

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (model, ea) =>
        {
            try
            {
                var body = ea.Body.ToArray();
                var json = Encoding.UTF8.GetString(body);

                _logger.LogDebug("Message received: {Message}", json);

                var @event = JsonSerializer.Deserialize<ScheduleRequestCreatedEvent>(json);
                if (@event is null)
                {
                    _logger.LogWarning("Failed to deserialize ScheduleRequestCreatedEvent");
                    await _channel.BasicNackAsync(ea.DeliveryTag, false, false, stoppingToken);
                    return;
                }

                await SendScheduleRequestNotificationsAsync(@event, stoppingToken);
                await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);

                _logger.LogInformation("Schedule request notifications sent and acknowledged: {Email}", @event.ClientEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing schedule request email event");
                try
                {
                    // Requeue the message for retry
                    await _channel.BasicNackAsync(ea.DeliveryTag, false, true, stoppingToken);
                }
                catch (Exception nackEx)
                {
                    _logger.LogError(nackEx, "Failed to nack message");
                }
            }
        };

        await _channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer, cancellationToken: stoppingToken);
        _logger.LogInformation("ScheduleRequestEmailConsumer started consuming messages from '{QueueName}'", QueueName);

        // Keep the consumer running
        try
        {
            await Task.Delay(Timeout.Infinite, stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Consumer message loop stopped");
        }
    }

    private async Task SendScheduleRequestNotificationsAsync(ScheduleRequestCreatedEvent @event, CancellationToken cancellationToken)
    {
        // Send email notification
        await SendScheduleRequestEmailAsync(@event, cancellationToken);

        // Send push notification
        await SendScheduleRequestPushNotificationAsync(@event, cancellationToken);
    }

    private async Task SendScheduleRequestEmailAsync(ScheduleRequestCreatedEvent @event, CancellationToken cancellationToken)
    {
        var subject = "New Schedule Request from Your Gardener";
        
        // Format the scheduled date and time in a user-friendly way
        var scheduledTime = @event.ScheduledAtUtc.ToLocalTime();
        var scheduledDate = scheduledTime.ToString("dddd, MMMM d, yyyy");
        var scheduledTimeStr = scheduledTime.ToString("h:mm tt");

        var body = $@"
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; border: 1px solid #ddd; }}
        .schedule-details {{ background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 4px; }}
        .schedule-details h3 {{ margin-top: 0; color: #4CAF50; }}
        .detail-row {{ margin: 10px 0; }}
        .detail-label {{ font-weight: bold; color: #555; }}
        .button {{ display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin-top: 20px; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #888; text-align: center; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>📅 New Schedule Request</h1>
        </div>
        <div class='content'>
            <p>Hello {EscapeHtml(@event.ClientName)},</p>
            <p>Your gardener <strong>{EscapeHtml(@event.GardenerName)}</strong> has proposed a schedule for your upcoming task.</p>
            
            <div class='schedule-details'>
                <h3>Schedule Details</h3>
                <div class='detail-row'>
                    <span class='detail-label'>Task:</span> {EscapeHtml(@event.TaskName)}
                </div>
                <div class='detail-row'>
                    <span class='detail-label'>Scheduled Date:</span> {scheduledDate}
                </div>
                <div class='detail-row'>
                    <span class='detail-label'>Scheduled Time:</span> {scheduledTimeStr}
                </div>
            </div>

            <p>Please log in to your Garden account to review and respond to this schedule request.</p>
            
            <p style='text-align: center;'>
                <a href='http://localhost:5173/schedule-requests' class='button'>View Schedule Request</a>
            </p>

            <p>You can approve the schedule, decline it, or propose an alternative time that works better for you.</p>
            
            <p>Best regards,<br/>The Garden Team</p>
        </div>
        <div class='footer'>
            <p>This is an automated notification from the Garden platform.</p>
        </div>
    </div>
</body>
</html>";

        await _emailService.SendAsync(@event.ClientEmail, subject, body, cancellationToken);
    }

    private async Task SendScheduleRequestPushNotificationAsync(ScheduleRequestCreatedEvent @event, CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<GardenDbContext>();

            // Get client's push token
            var client = await dbContext.Clients
                .AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == @event.ClientId, cancellationToken);

            if (client?.ExpoPushToken is null)
            {
                _logger.LogDebug("No push token found for client {ClientId}, skipping push notification", @event.ClientId);
                return;
            }

            var scheduledTime = @event.ScheduledAtUtc.ToLocalTime();
            var scheduledDate = scheduledTime.ToString("MMM d, yyyy");
            var scheduledTimeStr = scheduledTime.ToString("h:mm tt");

            var title = "New Schedule Request";
            var body = $"{@event.GardenerName} proposed {scheduledDate} at {scheduledTimeStr} for: {@event.TaskName}";

            var data = new
            {
                type = "schedule_request",
                scheduleRequestId = @event.ScheduleRequestId,
                taskId = @event.TaskId,
                scheduledAtUtc = @event.ScheduledAtUtc
            };

            await _pushNotificationService.SendPushNotificationAsync(
                client.ExpoPushToken,
                title,
                body,
                data,
                cancellationToken);

            _logger.LogInformation("Push notification sent to client {ClientId} for schedule request {ScheduleRequestId}",
                @event.ClientId, @event.ScheduleRequestId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send push notification for schedule request {ScheduleRequestId}", @event.ScheduleRequestId);
            // Don't throw - email was already sent successfully
        }
    }

    private static string EscapeHtml(string text)
    {
        if (string.IsNullOrEmpty(text))
            return text;

        return text
            .Replace("&", "&amp;")
            .Replace("<", "&lt;")
            .Replace(">", "&gt;")
            .Replace("\"", "&quot;")
            .Replace("'", "&#39;");
    }

    public override void Dispose()
    {
        try
        {
            _channel?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing channel");
        }

        try
        {
            _connection?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error closing connection");
        }

        base.Dispose();
    }
}
