using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Text.Encodings.Web;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Primitives;
using Xunit;
using Garden.BuildingBlocks.Infrastructure.Persistence;

namespace Garden.Api.Tests.Integration
{
    // Test authentication handler that builds a ClaimsPrincipal from test headers
    public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
    {
        public TestAuthHandler(
            IOptionsMonitor<AuthenticationSchemeOptions> options,
            ILoggerFactory logger,
            UrlEncoder encoder,
            ISystemClock clock)
            : base(options, logger, encoder, clock)
        {
        }

        protected override Task<AuthenticateResult> HandleAuthenticateAsync()
        {
            if (!Request.Headers.TryGetValue("X-Test-UserId", out StringValues idValues))
                return Task.FromResult(AuthenticateResult.NoResult());

            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.NameIdentifier, idValues.First())
            };

            if (Request.Headers.TryGetValue("X-Test-Email", out var email))
                claims.Add(new Claim(ClaimTypes.Email, email.First()));

            if (Request.Headers.TryGetValue("X-Test-Role", out var role))
                claims.Add(new Claim(ClaimTypes.Role, role.First()));

            if (Request.Headers.TryGetValue("X-Test-Iat", out var iat))
                claims.Add(new Claim("iat", iat.First()));

            var identity = new ClaimsIdentity(claims, "Test");
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, "Test");

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
    }

    // Factory that replaces authentication with test scheme and uses InMemory DB for GardenDbContext
    public class TestApiFactory : WebApplicationFactory<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            builder.ConfigureTestServices(services =>
            {
                // Replace authentication with test scheme
                services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = "Test";
                    options.DefaultChallengeScheme = "Test";
                }).AddScheme<AuthenticationSchemeOptions, TestAuthHandler>("Test", _ => { });

                // Remove existing GardenDbContext registrations
                var registrations = services.Where(d => d.ServiceType == typeof(GardenDbContext) || d.ServiceType == typeof(DbContextOptions<GardenDbContext>)).ToList();
                foreach (var r in registrations) services.Remove(r);

                // Add InMemory GardenDbContext
                services.AddDbContext<GardenDbContext>(options =>
                {
                    options.UseInMemoryDatabase("IntegrationTestsDb_" + Guid.NewGuid().ToString("N"));
                });
            });
        }
    }

    public class ProfileEndpointsTests : IClassFixture<TestApiFactory>
    {
        private readonly TestApiFactory _factory;
        private const string ProfileUrl = "/api/identity/me"; // adjust if your route differs

        public ProfileEndpointsTests(TestApiFactory factory) => _factory = factory;

        private static void AddTestUserHeaders(HttpRequestMessage req, Guid userId, string email = null, string role = null, DateTime? issuedAt = null)
        {
            req.Headers.Add("X-Test-UserId", userId.ToString());
            if (!string.IsNullOrEmpty(email)) req.Headers.Add("X-Test-Email", email);
            if (!string.IsNullOrEmpty(role)) req.Headers.Add("X-Test-Role", role);
            if (issuedAt.HasValue) req.Headers.Add("X-Test-Iat", issuedAt.Value.ToString("o"));
        }

        [Fact]
        public async Task GetMyProfile_ReturnsGardenerProfile_WhenAuthenticatedAsGardener()
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GardenDbContext>();

            var gardenerId = Guid.NewGuid();
            var gardener = new GardenerRecord
            {
                Id = gardenerId,
                Email = "g-integ@example.com",
                CompanyName = "Integration Gardener",
                PasswordHash = "hash",
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Gardeners.Add(gardener);
            await db.SaveChangesAsync();

            var client = _factory.CreateClient();
            var request = new HttpRequestMessage(HttpMethod.Get, ProfileUrl);
            AddTestUserHeaders(request, gardenerId, gardener.Email, "Gardener", DateTime.UtcNow);

            var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var payload = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;

            Assert.Equal(gardenerId.ToString(), root.GetProperty("id").GetString());
            Assert.Equal(gardener.Email, root.GetProperty("email").GetString());

            var hasDisplay = root.TryGetProperty("displayName", out var dn) || root.TryGetProperty("companyName", out dn);
            Assert.True(hasDisplay);
            Assert.Equal(gardener.CompanyName, dn.GetString());
        }

        [Fact]
        public async Task GetMyProfile_ReturnsClientProfile_WhenAuthenticatedAsClient()
        {
            using var scope = _factory.Services.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<GardenDbContext>();

            var clientId = Guid.NewGuid();
            var clientRecord = new ClientRecord
            {
                Id = clientId,
                Email = "client-integ@example.com",
                Name = "Integration Client",
                PasswordHash = "hash",
                CreatedAtUtc = DateTime.UtcNow
            };
            db.Clients.Add(clientRecord);
            await db.SaveChangesAsync();

            var httpClient = _factory.CreateClient();
            var request = new HttpRequestMessage(HttpMethod.Get, ProfileUrl);
            AddTestUserHeaders(request, clientId, clientRecord.Email, "Client", DateTime.UtcNow);

            var response = await httpClient.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);

            var payload = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(payload);
            var root = doc.RootElement;

            Assert.Equal(clientId.ToString(), root.GetProperty("id").GetString());
            Assert.Equal(clientRecord.Email, root.GetProperty("email").GetString());

            string mappedName = null;
            if (root.TryGetProperty("displayName", out var v)) mappedName = v.GetString();
            else if (root.TryGetProperty("name", out v)) mappedName = v.GetString();
            else if (root.TryGetProperty("companyName", out v)) mappedName = v.GetString();

            Assert.Equal(clientRecord.Name, mappedName);
        }

        [Fact]
        public async Task GetMyProfile_ReturnsUnauthorized_WhenNoTestHeaders()
        {
            var client = _factory.CreateClient();
            var response = await client.GetAsync(ProfileUrl);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
    }
}
