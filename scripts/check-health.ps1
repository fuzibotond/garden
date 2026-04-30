Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$urls = Get-ServiceUrls
$composeServices = Get-ComposeServices
$testStatus = Read-ArtifactJson -FileName "test-status.json"
$smokeStatus = Read-ArtifactJson -FileName "smoke-status.json"
$mobileProcess = Read-ArtifactJson -FileName "mobile-process.json"

$apiReady = Test-HttpEndpoint -Url $urls.apiHealthReady
$webStatus = Test-HttpEndpoint -Url $urls.web
$rabbitPair = "{0}:{1}" -f (Get-LocalLaunchConfig).RABBITMQ_USER, (Get-LocalLaunchConfig).RABBITMQ_PASSWORD
$rabbitAuth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes($rabbitPair))
$rabbitStatus = Test-HttpEndpoint -Url "$($urls.rabbitmq)/api/overview" -Headers @{ Authorization = "Basic $rabbitAuth" }
$dozzleStatus = Test-HttpEndpoint -Url "$($urls.dozzle)/healthcheck"

$workerStatus = if ($apiReady.Success -and $rabbitStatus.Success) { "healthy" } elseif ($apiReady.StatusCode) { "starting" } else { "unhealthy" }
$mobileHealth = "unhealthy"
$mobileNote = "Run launch-local.ps1 -StartMobile to include Expo."
if ($mobileProcess -and $mobileProcess.pid -and (Get-Process -Id $mobileProcess.pid -ErrorAction SilentlyContinue)) {
    $mobileHealth = "starting"
    $mobileNote = "Expo host process is running."
}

$rows = @(
    [pscustomobject]@{ Service = "api"; Status = (Get-ComposeServiceStatus -Services $composeServices -Name "api").State; Health = if ($apiReady.Success) { "healthy" } else { "unhealthy" }; Url = $urls.api; Note = "ready=$($urls.apiHealthReady)" },
    [pscustomobject]@{ Service = "database"; Status = (Get-ComposeServiceStatus -Services $composeServices -Name "sqlserver").State; Health = (Get-ComposeServiceStatus -Services $composeServices -Name "sqlserver").Health; Url = $urls.sqlserver; Note = "SQL Server container" },
    [pscustomobject]@{ Service = "rabbitmq"; Status = (Get-ComposeServiceStatus -Services $composeServices -Name "rabbitmq").State; Health = if ($rabbitStatus.Success) { "healthy" } else { "unhealthy" }; Url = $urls.rabbitmq; Note = "Management UI" },
    [pscustomobject]@{ Service = "frontend"; Status = (Get-ComposeServiceStatus -Services $composeServices -Name "web").State; Health = if ($webStatus.Success) { "healthy" } else { "unhealthy" }; Url = $urls.web; Note = "Vite dev server" },
    [pscustomobject]@{ Service = "notification-workers"; Status = "embedded"; Health = $workerStatus; Url = $urls.api; Note = "Hosted inside the API process" },
    [pscustomobject]@{ Service = "mobile"; Status = if ($mobileProcess) { "host-process" } else { "manual" }; Health = $mobileHealth; Url = "expo://localhost"; Note = $mobileNote },
    [pscustomobject]@{ Service = "mailhog"; Status = (Get-ComposeServiceStatus -Services $composeServices -Name "mailhog").State; Health = (Get-ComposeServiceStatus -Services $composeServices -Name "mailhog").Health; Url = $urls.mailhog; Note = "SMTP capture UI" },
    [pscustomobject]@{ Service = "logs"; Status = (Get-ComposeServiceStatus -Services $composeServices -Name "dozzle").State; Health = if ($dozzleStatus.Success) { "healthy" } else { "unhealthy" }; Url = $urls.dozzle; Note = "Container log viewer" }
)

$summary = [ordered]@{
    runAt = (Get-Date).ToString("o")
    status = if (@($rows | Where-Object { $_.Health -eq "unhealthy" }).Count -eq 0) { "healthy" } else { "degraded" }
    services = $rows
    lastTests = if ($testStatus) { $testStatus.status } else { "not-run" }
    lastSmokeTests = if ($smokeStatus) { $smokeStatus.status } else { "not-run" }
}

$path = Write-ArtifactJson -FileName "health-status.json" -Data $summary

$rows | Format-Table -AutoSize | Out-String | Write-Host
Write-Host "Last test status: $($summary.lastTests)"
Write-Host "Last smoke-test status: $($summary.lastSmokeTests)"
Write-Host "Health snapshot: $path"