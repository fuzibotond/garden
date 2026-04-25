using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Events;
using Garden.BuildingBlocks.Services;
using Garden.Modules.Notifications.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using RabbitMQ.Client;
using RabbitMQ.Client.Events;
using System.Text;
using System.Text.Json;

namespace Garden.Modules.Notifications.Services;

public class TaskQuestionCreatedConsumer : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly RabbitMqOptions _rabbitOptions;
    private readonly ILogger<TaskQuestionCreatedConsumer> _logger;
    private IConnection? _connection;
    private IChannel? _channel;
    private const string QueueName = "task_question_created_queue";
    private const string RoutingKey = "taskquestioncreatedevent";

    public TaskQuestionCreatedConsumer(
        IServiceProvider serviceProvider,
        RabbitMqOptions rabbitOptions,
        ILogger<TaskQuestionCreatedConsumer> logger)
    {
        _serviceProvider = serviceProvider;
        _rabbitOptions = rabbitOptions;
        _logger = logger;
    }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var factory = new ConnectionFactory
        {
            HostName = _rabbitOptions.HostName,
            Port = _rabbitOptions.Port,
            UserName = _rabbitOptions.UserName,
            Password = _rabbitOptions.Password
        };

        _connection = await factory.CreateConnectionAsync(cancellationToken);
        _channel = await _connection.CreateChannelAsync(options: null);

        await _channel.ExchangeDeclareAsync(_rabbitOptions.ExchangeName, ExchangeType.Topic, durable: true, autoDelete: false, cancellationToken: cancellationToken);
        await _channel.QueueDeclareAsync(QueueName, durable: true, exclusive: false, autoDelete: false, cancellationToken: cancellationToken);
        await _channel.QueueBindAsync(QueueName, _rabbitOptions.ExchangeName, RoutingKey, cancellationToken: cancellationToken);

        var consumer = new AsyncEventingBasicConsumer(_channel);
        consumer.ReceivedAsync += async (model, ea) =>
        {
            try
            {
                var body = ea.Body.ToArray();
                var message = Encoding.UTF8.GetString(body);
                var @event = JsonSerializer.Deserialize<TaskQuestionCreatedEvent>(message);

                if (@event != null)
                {
                    await HandleEventAsync(@event);
                }

                await _channel.BasicAckAsync(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing TaskQuestionCreatedEvent");
                await _channel.BasicNackAsync(ea.DeliveryTag, false, true);
            }
        };

        await _channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer, cancellationToken: cancellationToken);
        _logger.LogInformation("TaskQuestionCreatedConsumer started listening on queue: {QueueName}", QueueName);
    }

    private async Task HandleEventAsync(TaskQuestionCreatedEvent @event)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<GardenDbContext>();
        var pushService = scope.ServiceProvider.GetRequiredService<IExpoPushNotificationService>();

        var client = await dbContext.Clients.FindAsync(@event.ClientId);
        if (client == null)
        {
            _logger.LogWarning("Client {ClientId} not found for question notification", @event.ClientId);
            return;
        }

        var gardener = await dbContext.Gardeners.FindAsync(@event.GardenerId);
        var gardenerName = gardener?.Name ?? gardener?.CompanyName ?? "Your gardener";

        var task = await dbContext.Tasks.FindAsync(@event.TaskId);
        var taskName = task?.Name ?? "a task";

        if (!string.IsNullOrWhiteSpace(client.ExpoPushToken))
        {
            await pushService.SendPushNotificationAsync(
                client.ExpoPushToken,
                "New Question",
                $"{gardenerName} asked about {taskName}",
                new { type = "question", questionId = @event.QuestionId, taskId = @event.TaskId }
            );

            _logger.LogInformation("Push notification sent to client {ClientId} for question {QuestionId}",
                @event.ClientId, @event.QuestionId);
        }
        else
        {
            _logger.LogWarning("Client {ClientId} has no push token registered", @event.ClientId);
        }
    }

    public async Task StopAsync(CancellationToken cancellationToken)
    {
        if (_channel != null)
        {
            await _channel.CloseAsync(cancellationToken);
            _channel.Dispose();
        }

        if (_connection != null)
        {
            await _connection.CloseAsync(cancellationToken);
            _connection.Dispose();
        }

        _logger.LogInformation("TaskQuestionCreatedConsumer stopped");
    }
}
