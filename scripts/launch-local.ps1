param(
    [switch]$StartMobile,
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$config = Get-LocalLaunchConfig
Assert-PortsAvailable -PortsByName @{
    api = $config.API_PORT
    web = $config.WEB_PORT
    sqlserver = $config.SQLSERVER_PORT
    rabbitmq = $config.RABBITMQ_PORT
    rabbitmqManagement = $config.RABBITMQ_MANAGEMENT_PORT
    smtp = $config.SMTP_PORT
    mailhog = $config.MAILHOG_UI_PORT
    dozzle = $config.DOZZLE_PORT
}

$composeArguments = @("up", "-d")
if (-not $SkipBuild) {
    $composeArguments += "--build"
}

$composeArguments += @("sqlserver", "rabbitmq", "mailhog", "api", "web", "dozzle")

Invoke-Compose @composeArguments
if ($LASTEXITCODE -ne 0) {
    throw "docker compose up failed with exit code $LASTEXITCODE."
}

if ($StartMobile) {
    $process = Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-File",
        (Join-Path $PSScriptRoot "start-mobile.ps1")
    ) -PassThru

    Write-ArtifactJson -FileName "mobile-process.json" -Data ([ordered]@{
        pid = $process.Id
        startedAt = (Get-Date).ToString("o")
    }) | Out-Null
}

& (Join-Path $PSScriptRoot "check-health.ps1")