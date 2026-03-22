// C#
public class NullEventPublisher : Garden.BuildingBlocks.Services.IEventPublisher
{
    public Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default)
        => Task.CompletedTask;
}