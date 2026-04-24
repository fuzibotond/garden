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
/// Background service that consumes ScheduleRequestStatusChangedEvent from RabbitMQ
/// and sends push notifications to gardeners when clients approve, decline, or propose
/// an alternative time for a schedule request.
/// </summary>
public sealed class ScheduleStatusChangedConsumer : BackgroundService
{
    private readonly RabbitMqOptions _rabbitOptions;
    private readonly IExpoPushNotificationService _pushNotificationService;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<ScheduleStatusChangedConsumer> _logger;

    private IConnection? _connection;
    private IChannel? _channel;

    private const string QueueName = "schedule-status.push.queue";
    private const string ExchangeName = "garden.events";
    private const string RoutingKey = "schedulerequeststatuschangedevent";

    public ScheduleStatusChangedConsumer(
        RabbitMqOptions rabbitOptions,
        IExpoPushNotificationService pushNotificationService,
        IServiceScopeFactory scopeFactory,
        ILogger<ScheduleStatusChangedConsumer> logger)
    {
        _rabbitOptions = rabbitOptions ?? throw new ArgumentNullException(nameof(rabbitOptions));
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
            _logger.LogInformation("ScheduleStatusChangedConsumer is stopping");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "ScheduleStatusChangedConsumer encountered an error");
            throw;
        }
    }

    private async Task InitializeRabbitMqAsync(CancellationToken cancellationToken)
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

        await _channel.ExchangeDeclareAsync(
            ExchangeName,
            ExchangeType.Topic,
            durable: true,
            autoDelete: false,
            cancellationToken: cancellationToken);

        await _channel.QueueDeclareAsync(
            QueueName,
            durable: true,
            exclusive: false,
            autoDelete: false,
            cancellationToken: cancellationToken);

        await _channel.QueueBindAsync(QueueName, ExchangeName, RoutingKey, cancellationToken: cancellationToken);
        await _channel.BasicQosAsync(0, 1, false, cancellationToken);

        _logger.LogInformation(
            "ScheduleStatusChangedConsumer initialized: listening on queue '{QueueName}'", QueueName);
    }

    private async Task ConsumeMessagesAsync(CancellationToken stoppingToken)
    {
        if (_channel is null)
            throw new InvalidOperationException("Channel not initialized");

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (_, ea) =>
        {
            try
            {
                var json = Encoding.UTF8.GetString(ea.Body.ToArray());
                var @event = JsonSerializer.Deserialize<ScheduleRequestStatusChangedEvent>(json);

                if (@event is null)
                {
                    _logger.LogWarning("Failed to deserialize ScheduleRequestStatusChangedEvent");
                    await _channel.BasicNackAsync(ea.DeliveryTag, false, false, stoppingToken);
                    return;
                }

                await SendGardenerPushNotificationAsync(@event, stoppingToken);
                await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing ScheduleRequestStatusChangedEvent");
                try { await _channel.BasicNackAsync(ea.DeliveryTag, false, true, stoppingToken); }
                catch (Exception nackEx) { _logger.LogError(nackEx, "Failed to nack message"); }
            }
        };

        await _channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer, cancellationToken: stoppingToken);
        _logger.LogInformation("ScheduleStatusChangedConsumer started consuming from '{QueueName}'", QueueName);

        try { await Task.Delay(Timeout.Infinite, stoppingToken); }
        catch (OperationCanceledException) { /* normal shutdown */ }
    }

    private async Task SendGardenerPushNotificationAsync(
        ScheduleRequestStatusChangedEvent @event,
        CancellationToken cancellationToken)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<GardenDbContext>();

            var gardener = await dbContext.Gardeners
                .AsNoTracking()
                .FirstOrDefaultAsync(g => g.Id == @event.GardenerId, cancellationToken);

            if (gardener?.ExpoPushToken is null)
            {
                _logger.LogDebug("No push token for gardener {GardenerId}, skipping push", @event.GardenerId);
                return;
            }

            var (title, body) = @event.NewStatus switch
            {
                "Approved" => (
                    "Schedule Approved ✓",
                    $"{@event.ClientName} approved the schedule for: {@event.TaskName}"),
                "Declined" => (
                    "Schedule Declined",
                    $"{@event.ClientName} declined the schedule for: {@event.TaskName}"),
                "ProposedAlternative" => BuildProposedAlternativeMessage(@event),
                _ => ($"Schedule {@event.NewStatus}", $"{@event.ClientName} updated the schedule for: {@event.TaskName}")
            };

            await _pushNotificationService.SendPushNotificationAsync(
                gardener.ExpoPushToken,
                title,
                body,
                new
                {
                    type = "schedule_update",
                    scheduleRequestId = @event.ScheduleRequestId,
                    newStatus = @event.NewStatus
                },
                cancellationToken);

            _logger.LogInformation(
                "Push sent to gardener {GardenerId} for schedule {ScheduleRequestId} — status: {Status}",
                @event.GardenerId, @event.ScheduleRequestId, @event.NewStatus);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send push to gardener for schedule {ScheduleRequestId}", @event.ScheduleRequestId);
        }
    }

    private static (string title, string body) BuildProposedAlternativeMessage(ScheduleRequestStatusChangedEvent @event)
    {
        var title = "Alternative Time Proposed";
        if (@event.ProposedAtUtc is { } proposed)
        {
            var local = proposed.ToLocalTime();
            var body = $"{@event.ClientName} proposed {local:MMM d} at {local:h:mm tt} for: {@event.TaskName}";
            return (title, body);
        }
        return (title, $"{@event.ClientName} proposed an alternative time for: {@event.TaskName}");
    }

    public override void Dispose()
    {
        _channel?.DisposeAsync().AsTask().GetAwaiter().GetResult();
        _connection?.DisposeAsync().AsTask().GetAwaiter().GetResult();
        base.Dispose();
    }
}
