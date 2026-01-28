# WSJF: Deployable Template Backlog (2026-01-25)

This document captures and reconciles a WSJF-scored backlog proposed in the chat log stored at:

- `/.github/prompts/chat_wsjf_2026-01-25.md`

## WSJF formula

WSJF uses the standard formula:

$$
WSJF = \frac{BV + TC + RR}{JS}
$$

Where:

- **BV** = Business Value
- **TC** = Time Criticality
- **RR/OE** = Risk Reduction / Opportunity Enablement
- **JS** = Job Size

## Chat backlog (verbatim items)

The following items were proposed for a “deployable template” focus (assumption: single maintainer, repeatable deploy + docs):

- **Define deployment target + architecture (single VM? container platform? k8s?)**
  - WSJF: (10 + 10 + 8) / 2 = **14.0**
  - Output: chosen platform + constraints + definition of done

- **Production-ready configuration + env templates**
  - WSJF: (10 + 9 + 8) / 3 = **9.0**
  - Output: `.env.example` completeness, secrets list, prod-safe defaults

- **Containerization + minimal deploy path (Docker Compose or platform manifests)**
  - WSJF: (10 + 9 + 7) / 4 = **6.5**
  - Output: build/run instructions, health checks, ports, volumes

- **Backend build/start (no “ts-node in prod”) + migration/seed strategy**
  - WSJF: (9 + 8 + 8) / 4 = **6.25**
  - Output: `pnpm build` produces runnable artifact; migrations documented

- **Frontend production build + runtime config**
  - WSJF: (9 + 7 + 6) / 3 = **7.33**

- **One-click “smoke test” script for deployed instance**
  - WSJF: (7 + 7 + 7) / 2 = **10.5**

- **Observability baseline (structured logs + basic metrics/health)**
  - WSJF: (6 + 6 + 7) / 3 = **6.33**

## Alignment with the main plan

The primary plan lives at `/.github/prompts/plan-nextNodeAppBase.prompt.md`.

These chat items are not currently represented as a single “Deployable Template” epic in that plan. Instead:

- Some parts are already implemented and documented (e.g., Docker infrastructure).
- Some parts are implicitly present but not tracked as discrete WSJF-scored tasks.
- Some parts (e.g., an explicit _deployment target decision_) are not captured and should be tracked as a separate decision/task if still desired.

### Suggested merge strategy

- Keep the main plan focused on the current top priorities.
- Track “deployable template” sub-items in this doc (or a future dedicated “deployment design doc”) so the plan doesn’t become a wall of sub-bullets.
- If “deployable template” is still the active priority set, promote the missing items into the plan’s “Next Priorities” section.
