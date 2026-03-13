using Garden.Modules.Clients.Services;
using Microsoft.AspNetCore.Authorization;

namespace Garden.Modules.Identity.Features.Auth;

public class CreateClientHandler
{
    private readonly IClientService _clientService;

    public CreateClientHandler(IClientService clientService)
    {
        _clientService = clientService;
    }

    public async Task<CreateClientResponse> HandleAsync(CreateClientRequest request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(request.Email)) throw new ArgumentException("Email is required.");
        if (string.IsNullOrWhiteSpace(request.Name)) throw new ArgumentException("Name is required.");

        // generate an initial password
        var initialPassword = Guid.NewGuid().ToString("N").Substring(0, 12);

        var client = await _clientService.CreateClientAsync(request.Email, request.Name, initialPassword, cancellationToken);

        return new CreateClientResponse(client.Email, initialPassword);
    }
}
