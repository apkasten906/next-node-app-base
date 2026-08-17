#!/usr/bin/env sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
cd "$REPO_ROOT"

TARGET_URL="${TARGET_URL:-http://localhost:3001}"
REPORT_DIR="${REPORT_DIR:-reports/zap}"

mkdir -p "$REPORT_DIR"

docker run --rm \
  -v "$(pwd):/zap/wrk:rw" \
  ghcr.io/zaproxy/zaproxy:stable \
  zap-baseline.py \
  -t "$TARGET_URL" \
  -c security/zap/zap-baseline.conf \
  -r "$REPORT_DIR/zap-baseline.html" \
  -J "$REPORT_DIR/zap-baseline.json" \
  -w "$REPORT_DIR/zap-baseline.md"
