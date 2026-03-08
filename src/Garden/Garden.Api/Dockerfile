FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY ["src/Garden/Garden.Api/Garden.Api.csproj", "src/Garden/Garden.Api/"]
COPY ["src/Garden/Garden.BuildingBlocks/Garden.BuildingBlocks.csproj", "src/Garden/Garden.BuildingBlocks/"]
COPY ["src/Garden/Garden.Modules.Gardeners/Garden.Modules.Gardeners.csproj", "src/Garden/Garden.Modules.Gardeners/"]
COPY ["src/Garden/Garden.Modules.Identity/Garden.Modules.Identity.csproj", "src/Garden/Garden.Modules.Identity/"]
COPY ["src/Garden/Garden.Modules.Clients/Garden.Modules.Clients.csproj", "src/Garden/Garden.Modules.Clients/"]
COPY ["src/Garden/Garden.Modules.Tasks/Garden.Modules.Tasks.csproj", "src/Garden/Garden.Modules.Tasks/"]
COPY ["src/Garden/Garden.Modules.Scheduling/Garden.Modules.Scheduling.csproj", "src/Garden/Garden.Modules.Scheduling/"]
COPY ["src/Garden/Garden.Modules.Notifications/Garden.Modules.Notifications.csproj", "src/Garden/Garden.Modules.Notifications/"]

RUN dotnet restore "src/Garden/Garden.Api/Garden.Api.csproj"

COPY . .
WORKDIR "/src/src/Garden/Garden.Api"
RUN dotnet publish "Garden.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "Garden.Api.dll"]