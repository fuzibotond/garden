namespace Garden.BuildingBlocks.Services;

public interface IEventPublisher
{
    Task PublishAsync<TEvent>(TEvent @event, CancellationToken cancellationToken = default);
}
