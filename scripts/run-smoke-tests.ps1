Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$config = Get-LocalLaunchConfig
$urls = Get-ServiceUrls
$checks = @()
$loginToken = $null

function Add-SmokeCheck {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [scriptblock]$ScriptBlock
    )

    try {
        $result = & $ScriptBlock
        $script:checks += [pscustomobject]@{
            name = $Name
            status = "passed"
            details = $result
        }
    }
    catch {
        $script:checks += [pscustomobject]@{
            name = $Name
            status = "failed"
            details = $_.Exception.Message
        }
        throw
    }
}

try {
    Add-SmokeCheck -Name "api-live" -ScriptBlock {
        $response = Test-HttpEndpoint -Url $urls.apiHealthLive
        if (-not $response.Success) {
            throw "Expected 200 from $($urls.apiHealthLive), got $($response.StatusCode)."
        }

        return "API liveness returned 200."
    }

    Add-SmokeCheck -Name "api-ready" -ScriptBlock {
        $response = Test-HttpEndpoint -Url $urls.apiHealthReady
        if (-not $response.Success) {
            throw "Expected 200 from $($urls.apiHealthReady), got $($response.StatusCode)."
        }

        return "API readiness returned 200."
    }

    Add-SmokeCheck -Name "frontend-loads" -ScriptBlock {
        $response = Test-HttpEndpoint -Url $urls.web
        if (-not $response.Success) {
            throw "Expected 200 from $($urls.web), got $($response.StatusCode)."
        }

        return "Frontend returned 200."
    }

    Add-SmokeCheck -Name "database-connection" -ScriptBlock {
        $sqlCommand = @(
            "exec",
            "-T",
            "sqlserver",
            "/bin/sh",
            "-lc",
            "/opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P '$($config.MSSQL_SA_PASSWORD)' -Q 'SELECT 1' || /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P '$($config.MSSQL_SA_PASSWORD)' -Q 'SELECT 1'"
        )

        Invoke-Compose @sqlCommand | Out-Host
        $exitCode = $LASTEXITCODE
        if ($exitCode -ne 0) {
            throw "SQL Server probe failed with exit code $exitCode."
        }

        return "SQL Server accepted a test query."
    }

    Add-SmokeCheck -Name "rabbitmq-connection" -ScriptBlock {
        $pair = "{0}:{1}" -f $config.RABBITMQ_USER, $config.RABBITMQ_PASSWORD
        $encoded = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($pair))
        $response = Test-HttpEndpoint -Url "$($urls.rabbitmq)/api/overview" -Headers @{ Authorization = "Basic $encoded" }
        if (-not $response.Success) {
            throw "Expected 200 from RabbitMQ management overview, got $($response.StatusCode)."
        }

        return "RabbitMQ management API returned 200."
    }

    Add-SmokeCheck -Name "auth-login" -ScriptBlock {
        $response = Test-HttpEndpoint -Url "$($urls.api)/auth/login" -Method Post -Body @{
            email = $config.ADMIN_EMAIL
            password = "P@ssw0rd!"
        }

        if (-not $response.Success) {
            throw "Expected 200 from /auth/login, got $($response.StatusCode)."
        }

        $payload = $response.Body | ConvertFrom-Json
        if (-not $payload.accessToken) {
            throw "Login response did not include an access token."
        }

        $script:loginToken = $payload.accessToken
        return "Login returned an access token."
    }

    Add-SmokeCheck -Name "protected-endpoint-blocks-anonymous" -ScriptBlock {
        $response = Test-HttpEndpoint -Url "$($urls.api)/api/admin/relationships" -ExpectedStatusCodes @(401, 403)
        if (-not $response.Success) {
            throw "Expected 401 or 403 from protected endpoint, got $($response.StatusCode)."
        }

        return "Protected endpoint rejected anonymous access."
    }

    $mobileProcess = Read-ArtifactJson -FileName "mobile-process.json"
    if ($mobileProcess -and $mobileProcess.pid -and (Get-Process -Id $mobileProcess.pid -ErrorAction SilentlyContinue)) {
        $checks += [pscustomobject]@{
            name = "mobile-expo"
            status = "passed"
            details = "Expo host process is running."
        }
    }
    else {
        $checks += [pscustomobject]@{
            name = "mobile-expo"
            status = "skipped"
            details = "Mobile Expo launch is optional. Run launch-local.ps1 -StartMobile to include it."
        }
    }

    $summary = [ordered]@{
        status = "passed"
        runAt = (Get-Date).ToString("o")
        checks = $checks
    }

    Write-ArtifactJson -FileName "smoke-status.json" -Data $summary | Out-Null
}
catch {
    $summary = [ordered]@{
        status = "failed"
        runAt = (Get-Date).ToString("o")
        checks = $checks
        error = $_.Exception.Message
    }

    Write-ArtifactJson -FileName "smoke-status.json" -Data $summary | Out-Null
    throw
}