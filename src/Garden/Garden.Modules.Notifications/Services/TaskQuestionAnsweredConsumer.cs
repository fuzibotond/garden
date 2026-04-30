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

public class TaskQuestionAnsweredConsumer : IHostedService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly RabbitMqOptions _rabbitOptions;
    private readonly ILogger<TaskQuestionAnsweredConsumer> _logger;
    private IConnection? _connection;
    private IChannel? _channel;
    private const string QueueName = "task_question_answered_queue";
    private const string RoutingKey = "taskquestionansweredevent";

    public TaskQuestionAnsweredConsumer(
        IServiceProvider serviceProvider,
        RabbitMqOptions rabbitOptions,
        ILogger<TaskQuestionAnsweredConsumer> logger)
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
                var @event = JsonSerializer.Deserialize<TaskQuestionAnsweredEvent>(message);

                if (@event != null)
                {
                    await HandleEventAsync(@event);
                }

                await _channel.BasicAckAsync(ea.DeliveryTag, false);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error processing TaskQuestionAnsweredEvent");
                await _channel.BasicNackAsync(ea.DeliveryTag, false, true);
            }
        };

        await _channel.BasicConsumeAsync(QueueName, autoAck: false, consumer: consumer, cancellationToken: cancellationToken);
        _logger.LogInformation("TaskQuestionAnsweredConsumer started listening on queue: {QueueName}", QueueName);
    }

    private async Task HandleEventAsync(TaskQuestionAnsweredEvent @event)
    {
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<GardenDbContext>();
        var pushService = scope.ServiceProvider.GetRequiredService<IExpoPushNotificationService>();

        var gardener = await dbContext.Gardeners.FindAsync(@event.GardenerId);
        if (gardener == null)
        {
            _logger.LogWarning("Gardener {GardenerId} not found for answer notification", @event.GardenerId);
            return;
        }

        var client = await dbContext.Clients.FindAsync(@event.ClientId);
        var clientName = client?.Name ?? "Your client";

        var task = await dbContext.Tasks.FindAsync(@event.TaskId);
        var taskName = task?.Name ?? "a task";

        if (!string.IsNullOrWhiteSpace(gardener.ExpoPushToken))
        {
            await pushService.SendPushNotificationAsync(
                gardener.ExpoPushToken,
                "Question Answered",
                $"{clientName} answered your question about {taskName}",
                new { type = "answer", answerId = @event.AnswerId, questionId = @event.QuestionId, taskId = @event.TaskId }
            );

            _logger.LogInformation("Push notification sent to gardener {GardenerId} for answer {AnswerId}",
                @event.GardenerId, @event.AnswerId);
        }
        else
        {
            _logger.LogWarning("Gardener {GardenerId} has no push token registered", @event.GardenerId);
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

        _logger.LogInformation("TaskQuestionAnsweredConsumer stopped");
    }
}
