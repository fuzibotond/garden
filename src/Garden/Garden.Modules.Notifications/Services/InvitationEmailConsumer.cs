using Garden.BuildingBlocks.Events;
using Garden.BuildingBlocks.Services;
using Garden.Modules.Clients.Services;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace Garden.Modules.Notifications.Services;

/// <summary>
/// Background service that consumes InvitationCreatedEvent from RabbitMQ
/// and sends invitation emails to clients.
/// </summary>
public sealed class InvitationEmailConsumer : BackgroundService
{
    private readonly RabbitMqOptions _rabbitOptions;
    private readonly IEmailService _emailService;
    private readonly string _frontendBaseUrl;
    private readonly ILogger<InvitationEmailConsumer> _logger;

    private IConnection? _connection;
    private IChannel? _channel;

    private const string QueueName = "invitations.email.queue";
    private const string ExchangeName = "garden.events";
    private const string RoutingKey = "invitationcreatedevent";

    public InvitationEmailConsumer(
        RabbitMqOptions rabbitOptions,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<InvitationEmailConsumer> logger)
    {
        _rabbitOptions = rabbitOptions ?? throw new ArgumentNullException(nameof(rabbitOptions));
        _emailService = emailService ?? throw new ArgumentNullException(nameof(emailService));
        _frontendBaseUrl = (configuration["Frontend:BaseUrl"] ?? "http://localhost:8082").TrimEnd('/');
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
            _logger.LogInformation("InvitationEmailConsumer is stopping");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "InvitationEmailConsumer encountered an error and will stop");
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

            _logger.LogInformation("InvitationEmailConsumer initialized: listening on queue '{QueueName}' with routing key '{RoutingKey}'",
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

                var @event = JsonSerializer.Deserialize<InvitationCreatedEvent>(json);
                if (@event is null)
                {
                    _logger.LogWarning("Failed to deserialize InvitationCreatedEvent");
                    await _channel.BasicNackAsync(ea.DeliveryTag, false, false, stoppingToken);
                    return;
                }

                await SendInvitationEmailAsync(@event, stoppingToken);
                await _channel.BasicAckAsync(ea.DeliveryTag, false, stoppingToken);

                _logger.LogInformation("Invitation email sent and acknowledged: {Email}", @event.Email);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing invitation email event");
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
        _logger.LogInformation("InvitationEmailConsumer started consuming messages from '{QueueName}'", QueueName);

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

    private async Task SendInvitationEmailAsync(InvitationCreatedEvent @event, CancellationToken cancellationToken)
    {
        var subject = "You're Invited to Garden!";
        var signupLink = $"{_frontendBaseUrl}/signup?token={Uri.EscapeDataString(@event.Token)}";
        var expiresIn = (@event.ExpiresAtUtc - DateTime.UtcNow).TotalHours;

        var body = $@"
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background-color: #4CAF50; color: white; padding: 20px; text-align: center; }}
        .content {{ padding: 20px; border: 1px solid #ddd; }}
        .button {{ display: inline-block; background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 4px; margin-top: 20px; }}
        .footer {{ margin-top: 30px; font-size: 12px; color: #888; text-align: center; }}
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>Welcome to Garden!</h1>
        </div>
        <div class='content'>
            <p>Hello,</p>
            <p>You have been invited to join the Garden platform. Garden helps gardeners manage their clients, services, jobs, and schedules.</p>
            <p><a href='{signupLink}' class='button'>Get Started</a></p>
            <p style='color: #888; font-size: 12px;'>
                Or copy and paste this link in your browser:<br/>
                {signupLink}
            </p>
            <p>This invitation expires in {expiresIn:F1} hours.</p>
            <p>Best regards,<br/>The Garden Team</p>
        </div>
        <div class='footer'>
            <p>If you did not expect this invitation, please ignore this email.</p>
        </div>
    </div>
</body>
</html>";

        await _emailService.SendAsync(@event.Email, subject, body, cancellationToken);
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
