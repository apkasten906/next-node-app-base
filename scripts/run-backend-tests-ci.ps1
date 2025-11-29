Param(
    [string]$Node = 'node'
)

$scriptPath = Join-Path $PSScriptRoot 'run-backend-tests-ci.js'
if (-not (Test-Path $scriptPath)) {
    Write-Error "Script not found: $scriptPath"
    exit 1
}

Write-Host "Invoking Node script: $scriptPath"
& $Node $scriptPath
exit $LASTEXITCODE
