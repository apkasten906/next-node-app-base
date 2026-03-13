#!/usr/bin/env bash
set -euo pipefail

# Pinned to match kubernetes/observability/README.md
PROMETHEUS_OPERATOR_TAG="${PROMETHEUS_OPERATOR_TAG:-v0.89.0}"
DRY_RUN=false

usage() {
  cat <<'EOF'
Usage: scripts/install-prometheus-operator-crds.sh [--dry-run]

Installs the PrometheusRule CRD if not already present.

Note: this script only checks for CRD existence and does not verify that
the installed version matches PROMETHEUS_OPERATOR_TAG. If the CRD is
already present (regardless of version), the script exits 0. To upgrade
an existing CRD, delete it first: kubectl delete crd $CRD_NAME

Env vars:
  PROMETHEUS_OPERATOR_TAG   Prometheus Operator git tag (default: v0.89.0)
EOF
}

for arg in "$@"; do
  case "$arg" in
    --dry-run)
      DRY_RUN=true
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown arg: $arg" >&2
      usage >&2
      exit 2
      ;;
  esac
done

command -v kubectl >/dev/null 2>&1 || {
  echo "kubectl not found on PATH" >&2
  exit 1
}

CRD_NAME="prometheusrules.monitoring.coreos.com"

if kubectl get crd "$CRD_NAME" -o name >/dev/null 2>&1; then
  echo "CRD already present: $CRD_NAME"
  exit 0
fi

CRD_URL="https://raw.githubusercontent.com/prometheus-operator/prometheus-operator/${PROMETHEUS_OPERATOR_TAG}/example/prometheus-operator-crd/monitoring.coreos.com_prometheusrules.yaml"

echo "Installing PrometheusRule CRD from: $CRD_URL"

if [ "$DRY_RUN" = true ]; then
  echo "Dry-run mode enabled; not applying CRD."
  echo "kubectl apply -f $CRD_URL"
  exit 0
fi

kubectl apply -f "$CRD_URL"
kubectl get crd "$CRD_NAME" -o name
