# Security Governance (Summary)

This document summarizes the security governance and practices for the `next-node-app-base` repository.

Key practices:

- Follow OWASP Top 10 guidance for design and implementation.
- Use DI patterns to swap or mock security providers in tests (`apps/backend/src/security/interfaces.ts`).
- Run automated dependency scanning in CI (`.github/workflows/security-scan.yml`) using OWASP Dependency-Check and `pnpm audit`.
- Use SAST/DAST as part of pipeline (recommend integrating tools such as Snyk, Trivy and OWASP ZAP in later pipeline stages).
- Use secret scanning (GitHub Advanced Security) and avoid committing secrets to the repo. See `SECURITY.md` for incident response.

Developer guidance:

- Local development should use `TEST_EXTERNAL_SERVICES=false` to avoid talking to external services during unit tests.
- Use `tsyringe` DI to register concrete implementations in `apps/backend/src/container.ts` and implement interfaces from `apps/backend/src/security/interfaces.ts`.
- For production, configure a secrets manager (Vault / AWS Secrets Manager) and populate environment variables via CI/CD.

Further work:

- Integrate OWASP ZAP DAST job in GitHub Actions for PR scans of staging deployments.
- Add automated container scanning (Trivy) and infrastructure IaC scanning (Checkov/Tfsec).
