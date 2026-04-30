Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$mobileProcess = Read-ArtifactJson -FileName "mobile-process.json"
if ($mobileProcess -and $mobileProcess.pid) {
    $process = Get-Process -Id $mobileProcess.pid -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $mobileProcess.pid -Force
    }
}

$artifactsDirectory = Get-ArtifactsDirectory
$mobileProcessFile = Join-Path $artifactsDirectory "mobile-process.json"
if (Test-Path -Path $mobileProcessFile) {
    Remove-Item -Path $mobileProcessFile -Force
}

Invoke-Compose down --remove-orphans
if ($LASTEXITCODE -ne 0) {
    throw "docker compose down failed with exit code $LASTEXITCODE."
}