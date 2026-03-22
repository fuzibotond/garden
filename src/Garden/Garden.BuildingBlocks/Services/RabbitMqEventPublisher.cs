using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using System.Text;
using System.Text.Json;

namespace Garden.BuildingBlocks.Services;

/// <summary>
/// Event publisher using RabbitMQ for asynchronous message distribution.
/// Publishes domain events to a RabbitMQ topic exchange for consumption by services.
/// </summary>
public sealed class RabbitMqEventPublisher : IEventPublisher
{
    private readonly RabbitMqOptions _options;
    private readonly ILogger<RabbitMqEventPublisher> _logger;

    public RabbitMqEventPublisher(RabbitMqOptions options, ILogger<RabbitMqEventPublisher> logger)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));

        _logger.LogInformation("RabbitMqEventPublisher initialized for {HostName}:{Port}, exchange: {ExchangeName}", 
            options.HostName, options.Port, options.ExchangeName);
    }

    public async Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
    {
        if (@event is null)
            throw new ArgumentNullException(nameof(@event));

        var eventType = typeof(TEvent).Name;
        var routingKey = eventType.ToLowerInvariant();

        try
        {
            var factory = new ConnectionFactory
            {
                HostName = _options.HostName,
                Port = _options.Port,
                UserName = _options.UserName,
                Password = _options.Password
            };

            // Create connection and channel
            await using var connection = await factory.CreateConnectionAsync(cancellationToken);
            await using var channel = await connection.CreateChannelAsync(options: null);

            // Declare exchange
            await channel.ExchangeDeclareAsync(
                _options.ExchangeName, 
                ExchangeType.Topic, 
                durable: true, 
                autoDelete: false,
                cancellationToken: cancellationToken);

            // Serialize event
            var payload = JsonSerializer.Serialize(@event);
            var body = Encoding.UTF8.GetBytes(payload);

            // Publish message
            var properties = new BasicProperties
            {
                ContentType = "application/json",
                Type = eventType,
                DeliveryMode = DeliveryModes.Persistent
            };

            await channel.BasicPublishAsync(
                exchange: _options.ExchangeName,
                routingKey: routingKey,
                mandatory: false,
                basicProperties: properties,
                body: new ReadOnlyMemory<byte>(body),
                cancellationToken: cancellationToken);

            _logger.LogInformation("Event published: type={EventType}, routingKey={RoutingKey}, size={PayloadSize} bytes",
                eventType, routingKey, body.Length);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to publish event: type={EventType}", eventType);
            throw;
        }
    }
}

