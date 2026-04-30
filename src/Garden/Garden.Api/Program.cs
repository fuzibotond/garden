using DotNetEnv;
using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.BuildingBlocks.Services;
using Garden.Modules.Clients;
using Garden.Modules.Gardeners;
using Garden.Modules.Identity;
using Garden.Modules.Materials;
using Garden.Modules.Notifications;
using Garden.Modules.Scheduling;
using Garden.Modules.Tasks;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.OpenApi;
using Prometheus;
using QuestPDF.Infrastructure;
using System.Diagnostics;
using System.Security.Claims;

QuestPDF.Settings.License = LicenseType.Community;

var builder = WebApplication.CreateBuilder(args);

builder.Logging.ClearProviders();
builder.Logging.Configure(options =>
{
    options.ActivityTrackingOptions = ActivityTrackingOptions.SpanId |
        ActivityTrackingOptions.TraceId |
        ActivityTrackingOptions.ParentId;
});
builder.Logging.AddJsonConsole(options =>
{
    options.IncludeScopes = true;
    options.TimestampFormat = "O";
});

if (builder.Environment.IsDevelopment())
{
    var envPath = Path.Combine(Directory.GetCurrentDirectory(), ".env.local");

    if (File.Exists(envPath))
    {
        Env.Load(envPath);
    }
    else
    {
        Console.WriteLine($".env.local not found at: {envPath}");
    }
}

builder.Configuration.AddEnvironmentVariables();
Console.WriteLine($"Jwt key loaded: {builder.Configuration["Jwt:Key"] is not null}");
Console.WriteLine($"Connection string loaded: {builder.Configuration.GetConnectionString("GardenDb") is not null}");
// Add services to the container.

builder.Services.AddControllers()
    .AddApplicationPart(typeof(Garden.Modules.Clients.ModuleExtensions).Assembly)
    .AddApplicationPart(typeof(Garden.Modules.Gardeners.ModuleExtensions).Assembly)
    .AddApplicationPart(typeof(Garden.Modules.Identity.ModuleExtensions).Assembly)
    .AddApplicationPart(typeof(Garden.Modules.Tasks.ModuleExtensions).Assembly)
    .AddApplicationPart(typeof(Garden.Modules.Scheduling.ModuleExtensions).Assembly)
    .AddApplicationPart(typeof(Garden.Modules.Materials.ModuleExtensions).Assembly);
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddIdentityModule(builder.Configuration);
builder.Services.AddGardenersModule();
builder.Services.AddClientsModule();
builder.Services.AddTasksModule();
builder.Services.AddSchedulingModule();
builder.Services.AddMaterialsModule();
builder.Services.AddNotificationsModule(builder.Configuration);

// Register API feature handlers
builder.Services.AddScoped<Garden.Api.Features.GardenerClients.GetGardenerClientsHandler>();
builder.Services.AddScoped<Garden.Api.Features.GardenerClients.GetGardenerClientHandler>();
builder.Services.AddScoped<Garden.Api.Features.GardenerClients.GetGardenerClientsTotalHandler>();
builder.Services.AddScoped<Garden.Api.Features.GardenerClients.UpdateGardenerClientHandler>();

// Configure event publishing with RabbitMQ
var rabbitOptions = builder.Configuration
    .GetSection("RabbitMq")
    .Get<RabbitMqOptions>() ?? new RabbitMqOptions();

builder.Services.AddSingleton(rabbitOptions);
builder.Services.AddSingleton<IEventPublisher, RabbitMqEventPublisher>();

// Configure Blob Storage Service
if (builder.Environment.IsProduction() && !string.IsNullOrEmpty(builder.Configuration["Azure:BlobStorage:ConnectionString"]))
{
    // Use Azure Blob Storage in production
    var blobConnectionString = builder.Configuration["Azure:BlobStorage:ConnectionString"];
    builder.Services.AddSingleton(sp => new Azure.Storage.Blobs.BlobServiceClient(blobConnectionString));
    builder.Services.AddSingleton<IBlobStorageService, AzureBlobStorageService>();
}
else
{
    // Use local file storage in development
    var baseUrl = builder.Configuration["FileStorage:BaseUrl"] ?? "http://localhost:5000/uploads";
    builder.Services.AddSingleton<IBlobStorageService>(sp => new LocalFileStorageService(baseUrl: baseUrl));
}

builder.Services.AddSwaggerGen(options =>
{
    // Use full type names for schema Ids to avoid collisions between similarly named types
    options.CustomSchemaIds(type => type.FullName);
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Garden API",
        Version = "v1"
    });

    options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Enter: Bearer {your JWT token}"
    });

    options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
    {
        [new OpenApiSecuritySchemeReference("Bearer", document)] = []
    });
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

builder.Services.AddDbContext<GardenDbContext>(options =>
    options.UseSqlServer(
        builder.Configuration.GetConnectionString("GardenDb"),
        sql => sql.EnableRetryOnFailure())
    .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.RelationalEventId.PendingModelChangesWarning)));

builder.Services
    .AddHealthChecks()
    .AddCheck<Garden.Api.Diagnostics.GardenDbHealthCheck>(
        name: "sqlserver",
        failureStatus: HealthStatus.Unhealthy,
        tags: ["ready"])
    .AddCheck<Garden.Api.Diagnostics.RabbitMqTcpHealthCheck>(
        name: "rabbitmq",
        failureStatus: HealthStatus.Unhealthy,
        tags: ["ready"]);

builder.Services.AddScoped<IPasswordHasher<GardenerRecord>, PasswordHasher<GardenerRecord>>();
builder.Services.AddScoped<IPasswordHasher<ClientRecord>, PasswordHasher<ClientRecord>>();
// Register RabbitMQ publisher (RabbitMqOptions instance and publisher already registered above)

var app = builder.Build();

app.Use(async (context, next) =>
{
    const string correlationIdHeader = "X-Correlation-ID";
    var correlationId = context.Request.Headers[correlationIdHeader].FirstOrDefault();

    if (string.IsNullOrWhiteSpace(correlationId))
    {
        correlationId = Activity.Current?.TraceId.ToString() ?? context.TraceIdentifier;
    }

    context.TraceIdentifier = correlationId;
    context.Response.Headers[correlationIdHeader] = correlationId;

    using (app.Logger.BeginScope(new Dictionary<string, object>
    {
        ["CorrelationId"] = correlationId
    }))
    {
        await next();
    }
});

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();

    // Ensure uploads directory exists before configuring static files
    var uploadsPath = Path.Combine(builder.Environment.ContentRootPath, "wwwroot", "uploads");
    Directory.CreateDirectory(uploadsPath);

    // Enable static files in development for local file storage
    app.UseStaticFiles(new StaticFileOptions
    {
        FileProvider = new Microsoft.Extensions.FileProviders.PhysicalFileProvider(uploadsPath),
        RequestPath = "/uploads"
    });
}

app.UseHttpsRedirection();
app.UseHttpMetrics();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

var liveHealthOptions = new HealthCheckOptions
{
    Predicate = _ => false,
    ResponseWriter = Garden.Api.Diagnostics.HealthCheckResponseWriter.WriteAsync
};

var readyHealthOptions = new HealthCheckOptions
{
    Predicate = registration => registration.Tags.Contains("ready"),
    ResponseWriter = Garden.Api.Diagnostics.HealthCheckResponseWriter.WriteAsync
};

app.MapHealthChecks("/health", readyHealthOptions);
app.MapHealthChecks("/health/live", liveHealthOptions);
app.MapHealthChecks("/health/ready", readyHealthOptions);
app.MapMetrics("/metrics");

app.MapControllers();
app.MapIdentityEndpoints();
app.MapGardenersEndpoints(); 


using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<GardenDbContext>();
        dbContext.Database.Migrate();
        Console.WriteLine("Database migration completed.");

        var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<GardenerRecord>>();
        const string adminEmail = "admin@admin.com";
        const string adminPassword = "P@ssw0rd!"; // change to a strong password
        if (!dbContext.Gardeners.Any(g => g.Email == adminEmail))
        {
            var admin = new GardenerRecord
            {
                Id = Guid.NewGuid(),
                Email = adminEmail,
                CompanyName = "Administrator",
                CreatedAtUtc = DateTime.UtcNow,
                LastLogoutUtc = null
            };
            admin.PasswordHash = passwordHasher.HashPassword(admin, adminPassword);
            dbContext.Gardeners.Add(admin);
            dbContext.SaveChanges();
            Console.WriteLine($"Seeded admin user: {adminEmail}");
        }
    }
    catch (Exception ex)
    {
        Console.WriteLine("Database migration failed:");
        Console.WriteLine(ex.Message);
        throw;
    }
}

app.Run();
