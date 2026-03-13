using Garden.BuildingBlocks.Infrastructure.Persistence;
using Garden.Modules.Clients;
using Garden.Modules.Gardeners;
using Garden.Modules.Identity;
using Garden.Modules.Notifications;
using Garden.Modules.Scheduling;
using Garden.Modules.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi;
using System.Security.Claims;
using DotNetEnv;

var builder = WebApplication.CreateBuilder(args);

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

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();

builder.Services.AddIdentityModule(builder.Configuration);
builder.Services.AddGardenersModule();
builder.Services.AddClientsModule();
builder.Services.AddTasksModule();
builder.Services.AddSchedulingModule();
builder.Services.AddNotificationsModule();

builder.Services.AddSwaggerGen(options =>
{
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
        sql => sql.EnableRetryOnFailure()));

builder.Services.AddScoped<IPasswordHasher<GardenerRecord>, PasswordHasher<GardenerRecord>>();


var app = builder.Build();


// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("AllowAll");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapGardenersEndpoints();


using (var scope = app.Services.CreateScope())
{
    try
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<GardenDbContext>();
        dbContext.Database.Migrate();
        Console.WriteLine("Database migration completed.");
    }
    catch (Exception ex)
    {
        Console.WriteLine("Database migration failed:");
        Console.WriteLine(ex.Message);
        throw;
    }
}

app.Run();
