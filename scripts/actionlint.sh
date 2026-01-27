#!/usr/bin/env bash
set -euo pipefail

VERSION="${1:-1.7.10}"
WORKFLOWS_PATH="${2:-.github/workflows}"

REPO="rhysd/actionlint"
BASE="https://github.com/${REPO}/releases/download/v${VERSION}"
TARBALL="actionlint_${VERSION}_linux_amd64.tar.gz"
CHECKSUMS="actionlint_${VERSION}_checksums.txt"

TMP_DIR="${TMPDIR:-/tmp}/actionlint-${VERSION}"
mkdir -p "${TMP_DIR}"

curl -fsSL -o "${TMP_DIR}/${TARBALL}" "${BASE}/${TARBALL}"
curl -fsSL -o "${TMP_DIR}/${CHECKSUMS}" "${BASE}/${CHECKSUMS}"

EXPECTED_SHA256="$(awk -v f="${TARBALL}" '$2==f {print $1; exit}' "${TMP_DIR}/${CHECKSUMS}")"
if [[ -z "${EXPECTED_SHA256}" ]]; then
  echo "Could not find SHA256 for ${TARBALL} in ${CHECKSUMS}" >&2
  head -n 50 "${TMP_DIR}/${CHECKSUMS}" >&2 || true
  exit 1
fi

echo "${EXPECTED_SHA256}  ${TMP_DIR}/${TARBALL}" | sha256sum -c -

tar -xzf "${TMP_DIR}/${TARBALL}" -C "${TMP_DIR}" actionlint

"${TMP_DIR}/actionlint" -version

if [[ -d "${WORKFLOWS_PATH}" ]]; then
  # Pass files explicitly for consistency across platforms.
  mapfile -t files < <(find "${WORKFLOWS_PATH}" -type f \( -name "*.yml" -o -name "*.yaml" \) | sort)
  if [[ ${#files[@]} -eq 0 ]]; then
    echo "No workflow files found under ${WORKFLOWS_PATH}" >&2
    exit 1
  fi
  "${TMP_DIR}/actionlint" "${files[@]}"
else
  "${TMP_DIR}/actionlint" "${WORKFLOWS_PATH}"
fi
