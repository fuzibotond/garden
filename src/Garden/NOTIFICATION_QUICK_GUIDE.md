# Quick Guide: Adding New Notifications

## Step-by-Step Process

### 1. Create the Event (in BuildingBlocks)
**Location:** `Garden.BuildingBlocks\Events\YourEventName.cs`

```csharp
namespace Garden.BuildingBlocks.Events;

/// <summary>
/// Event published when [describe when this event is triggered].
/// </summary>
public record YourEventCreatedEvent
{
    // Include all data needed for the notification
    public Guid RecipientId { get; init; }
    public string RecipientEmail { get; init; } = default!;
    public string RecipientName { get; init; } = default!;
    // Add other relevant fields
}
```

### 2. Publish the Event (in your Handler/Service)
**Example:** Any handler where the business action occurs

```csharp
using Garden.BuildingBlocks.Events;
using Garden.BuildingBlocks.Services;

public class YourHandler
{
    private readonly IEventPublisher _eventPublisher;
    // other dependencies...

    public YourHandler(IEventPublisher eventPublisher, /* ... */)
    {
        _eventPublisher = eventPublisher;
    }

    public async Task Handle(YourRequest request)
    {
        // Your business logic...
        
        // Publish the event
        var @event = new YourEventCreatedEvent
        {
            RecipientEmail = recipient.Email,
            RecipientName = recipient.Name,
            // ... populate all fields
        };

        await _eventPublisher.PublishAsync(@event, cancellationToken);
    }
}
```

### 3. Create the Email Consumer
**Location:** `Garden.Modules.Notifications\Services\YourEventEmailConsumer.cs`

```csharp
using Garden.BuildingBlocks.Events;
using Garden.BuildingBlocks.Services;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace Garden.Modules.Notifications.Services;

public sealed class YourEventEmailConsumer : BackgroundService
{
    private readonly RabbitMqOptions _rabbitOptions;
    private readonly IEmailService _emailService;
    private readonly ILogger<YourEventEmailConsumer> _logger;

    private IConnection? _connection;
    private IChannel? _channel;

    // Use lowercase event name for routing key
    private const string QueueName = "your-event.email.queue";
    private const string ExchangeName = "garden.events";
    private const string RoutingKey = "youreventcreatedevent";

    public YourEventEmailConsumer(
        RabbitMqOptions rabbitOptions,
        IEmailService emailService,
        ILogger<YourEventEmailConsumer> logger)
    {
        _rabbitOptions = rabbitOptions;
        _emailService = emailService;
        _logger = logger;
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
            _logger.LogInformation("YourEventEmailConsumer is stopping");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "YourEventEmailConsumer encountered an error");
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

        await _channel.QueueBindAsync(
            QueueName,
            ExchangeName,
            RoutingKey,
            cancellationToken: cancellationToken);

        await _channel.BasicQosAsync(0, 1, false, cancellationToken);

        _logger.LogInformation("YourEventEmailConsumer initialized: queue '{QueueName}'", QueueName);
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

                var @event = JsonSerializer.Deserialize<YourEventCreatedEvent>(json);
                if (@event is null)
                {
                    _logger.LogWarning("Failed to deserialize YourEventCreatedEvent");
                    await _channel.BasicNackAsync(ea.DeliveryTag, false, false, stoppingToken);
                    return;
                }

                await SendEmailAsync(@event, stoppingToken);
                await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);

                _logger.LogInformation("Email sent: {Email}", @event.RecipientEmail);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing email event");
                await _channel.BasicNackAsync(ea.DeliveryTag, false, true, stoppingToken);
            }
        };

        await _channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer, cancellationToken: stoppingToken);
        
        await Task.Delay(Timeout.Infinite, stoppingToken);
    }

    private async Task SendEmailAsync(YourEventCreatedEvent @event, CancellationToken cancellationToken)
    {
        var subject = "Your Email Subject";
        
        var body = $@"
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; border: 1px solid #ddd; }}
        .button {{ display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Your Title</h1>
        </div>
        <div class='content'>
            <p>Hello {EscapeHtml(@event.RecipientName)},</p>
            <p>Your email content here...</p>
        </div>
    </div>
</body>
</html>";

        await _emailService.SendAsync(@event.RecipientEmail, subject, body, cancellationToken);
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
            _connection?.Dispose();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disposing consumer");
        }

        base.Dispose();
    }
}
```

### 4. Register the Consumer
**File:** `Garden.Modules.Notifications\ModuleExtensions.cs`

```csharp
public static IServiceCollection AddNotificationsModule(this IServiceCollection services, IConfiguration configuration)
{
    // ... existing code ...
    
    // Register your new consumer
    services.AddHostedService<YourEventEmailConsumer>();
    
    return services;
}
```

## Naming Conventions

### Event Class Name
- Use `PastTense + Event` pattern
- Example: `ScheduleRequestCreatedEvent`, `TaskCompletedEvent`, `PaymentReceivedEvent`

### Queue Name
- Use lowercase with dashes
- Pattern: `{domain}.{purpose}.queue`
- Example: `schedule-requests.email.queue`, `tasks.completed.email.queue`

### Routing Key
- Use lowercase without special characters
- Same as event class name but lowercase
- Example: `schedulerequestcreatedevent`, `taskcompeletedevent`

## Common Email Sections

### Professional Email Template Structure
```html
<div class='header'>
    <!-- Branding and title -->
</div>
<div class='content'>
    <!-- Greeting -->
    <!-- Context -->
    <!-- Details box (if needed) -->
    <!-- Call to action -->
    <!-- Additional info -->
    <!-- Sign-off -->
</div>
<div class='footer'>
    <!-- Small print, disclaimers -->
</div>
```

## Tips

1. **Always include enough context** in the event so consumers don't need to query the database
2. **Use HTML escaping** for all user-provided content in emails
3. **Log important steps** (event published, email sent, errors)
4. **Make queues durable** so messages survive restarts
5. **Acknowledge messages** only after successful processing
6. **Requeue failed messages** for automatic retry
7. **Test with RabbitMQ Management UI** (http://localhost:15672)

## Example Use Cases

### Task Completion Notification
- **Event:** `TaskCompletedEvent`
- **Triggered:** When gardener marks task as complete
- **Recipient:** Client
- **Content:** Task details, completion time, next steps

### Appointment Reminder
- **Event:** `AppointmentReminderEvent`
- **Triggered:** 24 hours before scheduled time (scheduled job)
- **Recipient:** Both gardener and client
- **Content:** Appointment details, location, preparation instructions

### Payment Request
- **Event:** `InvoiceCreatedEvent`
- **Triggered:** When gardener generates an invoice
- **Recipient:** Client
- **Content:** Invoice details, amount, payment link

### Schedule Change Notification
- **Event:** `ScheduleUpdatedEvent`
- **Triggered:** When client proposes alternative time or approves/declines
- **Recipient:** Gardener
- **Content:** Original vs new schedule, client's message

## Troubleshooting

### Message not appearing in queue
1. Check RabbitMQ is running: `docker ps`
2. Verify routing key matches (case-sensitive in some contexts)
3. Check publisher logs for errors
4. Inspect RabbitMQ Management UI for exchange bindings

### Email not sending
1. Check SMTP settings in appsettings.json
2. Verify consumer is running (check startup logs)
3. Check consumer logs for deserialization errors
4. Test SMTP connection independently

### Messages stuck in queue
1. Check consumer logs for processing errors
2. Verify event structure matches between publisher and consumer
3. Check for unhandled exceptions in SendEmailAsync
