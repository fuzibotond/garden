param(
    [string[]]$Services,
    [switch]$Follow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$composeArguments = @("logs", "--tail", "200")
if ($Follow) {
    $composeArguments += "-f"
}

if ($Services) {
    $composeArguments += $Services
}

Invoke-Compose @composeArguments
exit $LASTEXITCODE