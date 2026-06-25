# OWASP ZAP Baseline Scan

The base template provides a ZAP baseline scan scaffold for common web vulnerabilities and insecure headers.

## Run

```bash
TARGET_URL=http://localhost:3001 sh security/zap/zap-baseline.sh
```

Reports are written under `reports/zap`. Adopters should tune rule severities and authenticated scan coverage for their application.
