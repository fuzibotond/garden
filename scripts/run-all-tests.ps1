Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "common.ps1")

$results = @()

function Invoke-TestStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [scriptblock]$ScriptBlock
    )

    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    & $ScriptBlock
    $exitCode = $LASTEXITCODE
    $stopwatch.Stop()

    $result = [ordered]@{
        name = $Name
        exitCode = $exitCode
        status = if ($exitCode -eq 0) { "passed" } else { "failed" }
        durationSeconds = [math]::Round($stopwatch.Elapsed.TotalSeconds, 2)
    }

    $script:results += [pscustomobject]$result

    if ($exitCode -ne 0) {
        throw "$Name failed with exit code $exitCode."
    }
}

try {
    Invoke-TestStep -Name "backend-tests" -ScriptBlock {
        dotnet test (Join-Path (Get-RepoRoot) "tests\Garden.Api.Tests\Garden.Api.Tests.csproj")
    }

    Push-Location (Join-Path (Get-RepoRoot) "apps\web")
    try {
        Invoke-TestStep -Name "web-tests" -ScriptBlock {
            npm.cmd test
        }
    }
    finally {
        Pop-Location
    }

    Push-Location (Join-Path (Get-RepoRoot) "apps\mobile-app")
    try {
        Invoke-TestStep -Name "mobile-tests" -ScriptBlock {
            npm.cmd test -- --runInBand
        }
    }
    finally {
        Pop-Location
    }

    $summary = [ordered]@{
        status = "passed"
        runAt = (Get-Date).ToString("o")
        results = $results
    }

    Write-ArtifactJson -FileName "test-status.json" -Data $summary | Out-Null
}
catch {
    $summary = [ordered]@{
        status = "failed"
        runAt = (Get-Date).ToString("o")
        results = $results
        error = $_.Exception.Message
    }

    Write-ArtifactJson -FileName "test-status.json" -Data $summary | Out-Null
    throw
}