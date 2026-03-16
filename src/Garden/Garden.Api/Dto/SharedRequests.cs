namespace Garden.Api.Dto
{
    public record CreateClientRequest(string Email, string FullName, string? Password);
    public record UpdateClientRequest(string? FullName, string? Email);

    public record CreateGardenerRequest(string Email, string Password, string CompanyName, string? ContactName);
    public record UpdateGardenerRequest(string? CompanyName, string? ContactName, string? Email);
}
