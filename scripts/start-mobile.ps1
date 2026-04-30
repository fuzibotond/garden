Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$config = Get-LocalLaunchConfig
$mobileRoot = Join-Path (Get-RepoRoot) "apps\mobile-app"

Push-Location $mobileRoot
try {
    if (-not $env:EXPO_PUBLIC_API_URL) {
        $env:EXPO_PUBLIC_API_URL = "http://localhost:$($config.API_PORT)"
        Write-Host "EXPO_PUBLIC_API_URL not set. Using $($env:EXPO_PUBLIC_API_URL). Override it for physical-device testing."
    }

    npm.cmd start
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}