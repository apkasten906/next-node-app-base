[CmdletBinding()]
param(
  # Pinned to match kubernetes/observability/README.md
  [string]$PrometheusOperatorTag = "v0.89.0",

  # When set, only prints what would be applied.
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"

function Write-Info([string]$Message) {
  Write-Host $Message -ForegroundColor Cyan
}

function Write-Warn([string]$Message) {
  Write-Host $Message -ForegroundColor Yellow
}

function Test-CommandAvailable([string]$Name) {
  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

if (-not (Test-CommandAvailable "kubectl")) {
  throw "Required command not found on PATH: kubectl"
}

$crdName = "prometheusrules.monitoring.coreos.com"

Write-Info "Checking for CRD: $crdName"
$existing = kubectl get crd $crdName -o name 2>$null
if ($LASTEXITCODE -eq 0 -and $existing) {
  Write-Info "CRD already present: $existing"
  exit 0
}

$crdUrl = "https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/$PrometheusOperatorTag/example/prometheus-operator-crd/monitoring.coreos.com_prometheusrules.yaml"
Write-Info "Installing PrometheusRule CRD from: $crdUrl"

if ($DryRun) {
  Write-Info "Dry-run mode enabled; not applying CRD."
  Write-Host "kubectl apply -f $crdUrl"
  exit 0
}

kubectl apply -f $crdUrl

Write-Info "Verifying CRD is installed"
kubectl get crd $crdName -o name
