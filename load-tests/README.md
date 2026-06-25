# Load Testing

This directory contains base k6 scaffolding for adopters to extend with domain-specific journeys.

## Run

```bash
BASE_URL=http://localhost:3001 k6 run load-tests/scenarios/api-load.js
```

The base scenario exercises health and readiness endpoints and defines shared thresholds for latency, error rate, and successful checks.
