Set-StrictMode -Version Latest

$Script:RepoRoot = Split-Path -Parent $PSScriptRoot
$Script:ArtifactsDirectory = Join-Path $Script:RepoRoot "artifacts\local-launch"

function Get-RepoRoot {
    return $Script:RepoRoot
}

function Get-ArtifactsDirectory {
    if (-not (Test-Path -Path $Script:ArtifactsDirectory)) {
        New-Item -ItemType Directory -Path $Script:ArtifactsDirectory -Force | Out-Null
    }

    return $Script:ArtifactsDirectory
}

function Get-EnvFilePath {
    foreach ($candidate in @(".env.local", ".env")) {
        $path = Join-Path $Script:RepoRoot $candidate
        if (Test-Path -Path $path) {
            return $path
        }
    }

    return $null
}

function Get-LocalLaunchConfig {
    $config = [ordered]@{
        API_PORT = "5055"
        WEB_PORT = "8082"
        SQLSERVER_PORT = "1433"
        SQLSERVER_DATABASE = "GardenDb"
        MSSQL_SA_PASSWORD = "LocalStrongPassword123!"
        RABBITMQ_PORT = "5672"
        RABBITMQ_MANAGEMENT_PORT = "15672"
        RABBITMQ_USER = "guest"
        RABBITMQ_PASSWORD = "guest"
        RABBITMQ_EXCHANGE = "garden.events"
        SMTP_PORT = "1025"
        MAILHOG_UI_PORT = "8025"
        SMTP_FROM_ADDRESS = "noreply@garden.local"
        DOZZLE_PORT = "9999"
        JWT_KEY = "dev-super-long-secret-key-32-characters-minimum"
        JWT_ISSUER = "Garden.Api"
        JWT_AUDIENCE = "Garden.App"
        ADMIN_EMAIL = "admin@admin.com"
    }

    $envFile = Get-EnvFilePath
    if (-not $envFile) {
        return $config
    }

    foreach ($line in Get-Content -Path $envFile) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith("#")) {
            continue
        }

        $parts = $trimmed.Split("=", 2)
        if ($parts.Count -ne 2) {
            continue
        }

        $config[$parts[0].Trim()] = $parts[1].Trim()
    }

    return $config
}

function Get-ComposeArguments {
    $arguments = @("-f", (Join-Path $Script:RepoRoot "docker-compose.yml"))
    $envFile = Get-EnvFilePath

    if ($envFile) {
        return @("--env-file", $envFile) + $arguments
    }

    return $arguments
}

function Invoke-Compose {
    param(
        [Parameter(ValueFromRemainingArguments = $true)]
        [string[]]$ComposeArguments
    )

    $arguments = (Get-ComposeArguments) + $ComposeArguments
    & docker compose @arguments
}

function Get-ComposeServices {
    $arguments = (Get-ComposeArguments) + @("ps", "--format", "json")
    $json = & docker compose @arguments 2>$null
    if (-not $json) {
        return @()
    }

    $parsed = $json | ConvertFrom-Json
    if ($parsed -is [System.Array]) {
        return $parsed
    }

    return @($parsed)
}

function Get-ComposeServiceStatus {
    param(
        [Parameter(Mandatory = $true)]
        [object[]]$Services,
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $service = $Services | Where-Object { $_.Service -eq $Name } | Select-Object -First 1
    if (-not $service) {
        return [pscustomobject]@{
            Name = $Name
            State = "missing"
            Health = "unhealthy"
        }
    }

    return [pscustomobject]@{
        Name = $service.Service
        State = $service.State
        Health = if ($service.Health) { $service.Health } else { $service.State }
    }
}

function Write-ArtifactJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName,
        [Parameter(Mandatory = $true)]
        [object]$Data
    )

    $path = Join-Path (Get-ArtifactsDirectory) $FileName
    $Data | ConvertTo-Json -Depth 8 | Set-Content -Path $path -Encoding UTF8
    return $path
}

function Read-ArtifactJson {
    param(
        [Parameter(Mandatory = $true)]
        [string]$FileName
    )

    $path = Join-Path (Get-ArtifactsDirectory) $FileName
    if (-not (Test-Path -Path $path)) {
        return $null
    }

    return Get-Content -Path $path -Raw | ConvertFrom-Json
}

function Test-HttpEndpoint {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Url,
        [ValidateSet("Get", "Post")]
        [string]$Method = "Get",
        [hashtable]$Headers,
        [object]$Body,
        [int[]]$ExpectedStatusCodes = @(200)
    )

    $invokeParameters = @{
        Uri = $Url
        Method = $Method
        UseBasicParsing = $true
        TimeoutSec = 15
    }

    if ($Headers) {
        $invokeParameters.Headers = $Headers
    }

    if ($null -ne $Body) {
        $invokeParameters.ContentType = "application/json"
        $invokeParameters.Body = ($Body | ConvertTo-Json -Compress)
    }

    try {
        $response = Invoke-WebRequest @invokeParameters
        return [pscustomobject]@{
            Url = $Url
            StatusCode = [int]$response.StatusCode
            Success = $ExpectedStatusCodes -contains [int]$response.StatusCode
            Body = $response.Content
            Error = $null
        }
    }
    catch {
        $statusCode = $null
        $body = $null

        if ($_.Exception.Response) {
            $statusCode = [int]$_.Exception.Response.StatusCode
            try {
                $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
                $body = $reader.ReadToEnd()
                $reader.Dispose()
            }
            catch {
                $body = $null
            }
        }

        return [pscustomobject]@{
            Url = $Url
            StatusCode = $statusCode
            Success = $statusCode -and ($ExpectedStatusCodes -contains $statusCode)
            Body = $body
            Error = $_.Exception.Message
        }
    }
}

function Get-ServiceUrls {
    $config = Get-LocalLaunchConfig
    return [ordered]@{
        api = "http://localhost:$($config.API_PORT)"
        apiHealthLive = "http://localhost:$($config.API_PORT)/health/live"
        apiHealthReady = "http://localhost:$($config.API_PORT)/health/ready"
        apiMetrics = "http://localhost:$($config.API_PORT)/metrics"
        swagger = "http://localhost:$($config.API_PORT)/swagger"
        web = "http://localhost:$($config.WEB_PORT)"
        rabbitmq = "http://localhost:$($config.RABBITMQ_MANAGEMENT_PORT)"
        mailhog = "http://localhost:$($config.MAILHOG_UI_PORT)"
        dozzle = "http://localhost:$($config.DOZZLE_PORT)"
        sqlserver = "localhost,$($config.SQLSERVER_PORT)"
    }
}

function Get-ListeningProcessesByPort {
    param(
        [Parameter(Mandatory = $true)]
        [int]$Port
    )

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique

    if (-not $connections) {
        return @()
    }

    return Get-Process -Id $connections -ErrorAction SilentlyContinue |
        Select-Object Id, ProcessName, Path
}

function Assert-PortsAvailable {
    param(
        [Parameter(Mandatory = $true)]
        [hashtable]$PortsByName
    )

    $conflicts = @()

    foreach ($entry in $PortsByName.GetEnumerator()) {
        $processes = @(Get-ListeningProcessesByPort -Port ([int]$entry.Value) |
            Where-Object { $_.ProcessName -notin @("com.docker.backend", "wslrelay") })
        if ($processes.Count -eq 0) {
            continue
        }

        $conflicts += [pscustomobject]@{
            name = $entry.Key
            port = $entry.Value
            processes = $processes
        }
    }

    if (@($conflicts).Count -eq 0) {
        return
    }

    $lines = foreach ($conflict in $conflicts) {
        $processSummary = ($conflict.processes | ForEach-Object {
            if ($_.Path) {
                "{0} ({1})" -f $_.ProcessName, $_.Id
            }
            else {
                "{0}" -f $_.Id
            }
        }) -join ", "

        "{0} port {1}: {2}" -f $conflict.name, $conflict.port, $processSummary
    }

    throw "Local launch cannot start because these ports are already in use: $($lines -join '; ')"
}