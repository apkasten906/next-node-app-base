# Pact Contract Scaffolding

This base repository keeps Pact artifacts lightweight and deterministic. The included health contract gives adopters a working shape for consumer-driven contracts without binding this template to a specific product API.

## Expected Flow

1. Consumer tests generate Pact files under `contracts/pact/pacts`.
2. Provider verification checks the backend against those contracts before deployment.
3. Incompatible provider changes fail verification and block release.

Domain-specific interactions belong in adopter repositories.
