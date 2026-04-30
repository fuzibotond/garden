param(
    [switch]$StartMobile,
    [switch]$SkipBuild
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

& (Join-Path $PSScriptRoot "stop-local.ps1")
& (Join-Path $PSScriptRoot "launch-local.ps1") @PSBoundParameters