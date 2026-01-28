# Behavior-Driven Development (BDD) with Cucumber

## Overview

This project uses **Cucumber** for Behavior-Driven Development (BDD), allowing us to write executable specifications in plain language (Gherkin) that serve as both documentation and automated tests.

## Why BDD?

- ✅ **Living Documentation**: Tests are written in business-readable language
- ✅ **Shared Understanding**: Bridge between technical and non-technical stakeholders
- ✅ **Executable Specifications**: Gherkin scenarios are the source of truth
- ✅ **Test-Driven Approach**: Write features first, then implement
- ✅ **Regression Protection**: Scenarios protect against breaking changes

## Architecture

```
apps/backend/features/
├── 01-foundation.feature          # Monorepo & governance
├── 02-security.feature             # Security framework
├── 03-backend-core.feature         # Express, Prisma, Redis
├── 05-testing.feature              # Testing infrastructure
├── 06-notifications.feature        # Notification service
├── 07-api-design.feature           # API patterns
├── 08-file-storage.feature         # File storage
├── 10-observability.feature        # Monitoring & logging
├── 11-advanced-testing.feature     # Advanced test strategies
├── 12-kubernetes-devops.feature    # K8s & CI/CD
├── step_definitions/               # TypeScript step implementations
│   ├── foundation.steps.ts
│   ├── api.steps.ts
│   ├── security.steps.ts
│   └── ...
└── support/
    ├── world.ts                    # Custom World context
    └── hooks.ts                    # Before/After hooks

apps/frontend/features/
├── 04-nextjs-frontend.feature      # Next.js application
├── 09-frontend-core.feature        # Frontend features
└── ...
```

## Gherkin Syntax

### Feature

A Feature represents a piece of functionality:

```gherkin
Feature: User Authentication
  As a user
  I want to log in to the application
  So that I can access my personal data

  Background:
    Given the authentication service is configured

  Scenario: Successful login with valid credentials
    Given I am on the login page
    When I enter email "user@example.com"
    And I enter password "SecurePass123!"
    And I click the login button
    Then I should be redirected to the dashboard
    And I should see a welcome message

  Scenario: Failed login with invalid credentials
    Given I am on the login page
    When I enter email "user@example.com"
    And I enter password "wrongpassword"
    And I click the login button
    Then I should see an error message "Invalid credentials"
    And I should remain on the login page
```

### Scenario Outline with Examples

For data-driven tests:

```gherkin
Scenario Outline: Password validation
  When I enter password "<password>"
  Then validation should return "<result>"

  Examples:
    | password       | result   |
    | weak           | rejected |
    | StrongP@ss123  | accepted |
    | 12345678       | rejected |
```

### Tags

Organize and filter scenarios:

```gherkin
@api @authentication @critical
Scenario: JWT token validation
  ...
```

## Running Cucumber Tests

### Backend

```bash
# Run all BDD scenarios
cd apps/backend
pnpm test:bdd

# Run with watch mode
pnpm test:bdd:watch

# Generate HTML report
pnpm test:bdd:report

# Run specific tag
pnpm test:bdd -- --tags "@api"

# Run specific feature
pnpm test:bdd features/02-security.feature

# Skip specific tags
pnpm test:bdd -- --tags "not @wip"
```

### Frontend

```bash
cd apps/frontend
pnpm test:bdd
```

## Writing Step Definitions

Step definitions connect Gherkin steps to TypeScript code:

```typescript
import { Given, When, Then } from '@cucumber/cucumber';
import { World } from '../support/world';
import { expect } from 'vitest';

Given('I am on the login page', async function (this: World) {
  // Navigate to login page
  this.setData('currentPage', '/login');
});

When('I enter email {string}', async function (this: World, email: string) {
  // Interact with email input
  this.setData('email', email);
});

Then('I should see a welcome message', async function (this: World) {
  const response = this.response;
  expect(response?.body).toHaveProperty('message');
  expect(response?.body.message).toContain('Welcome');
});
```

### Cucumber Expressions

Match step text dynamically:

```typescript
// String parameter
When('I enter name {string}', function (name: string) { ... })

// Integer parameter
Then('I should see {int} items', function (count: number) { ... })

// Float parameter
Then('price should be {float}', function (price: number) { ... })

// Word (no spaces)
Given('user is {word}', function (status: string) { ... })

// Optional text
When('I click( the) button', function () { ... })
```

### Data Tables

Handle tables in scenarios:

```gherkin
Given a user with attributes:
  | field    | value          |
  | email    | test@test.com  |
  | name     | Test User      |
  | role     | admin          |
```

```typescript
Given('a user with attributes:', async function (this: World, dataTable: any) {
  const data = dataTable.rowsHash(); // Convert to object
  // data = { email: 'test@test.com', name: 'Test User', role: 'admin' }
});
```

## Custom World Context

The `World` class provides shared context across steps:

```typescript
export class World extends CucumberWorld {
  app?: App;
  request?: ReturnType<typeof request>;
  response?: request.Response;
  testData: Record<string, any> = {};

  // Store data
  setData(key: string, value: any): void {
    this.testData[key] = value;
  }

  // Retrieve data
  getData<T>(key: string): T | undefined {
    return this.testData[key] as T;
  }
}
```

Usage in steps:

```typescript
When('I create a user', async function (this: World) {
  const user = await createUser();
  this.setData('createdUser', user);
});

Then('the user should exist', async function (this: World) {
  const user = this.getData('createdUser');
  expect(user).toBeDefined();
});
```

## Hooks

Execute code before/after scenarios:

```typescript
import { Before, After, BeforeAll, AfterAll } from '@cucumber/cucumber';

BeforeAll(async function () {
  console.log('Test suite starting');
});

Before(async function (this: World) {
  await this.initializeApp();
});

After(async function (this: World) {
  await this.cleanup();
});

// Tagged hooks
Before({ tags: '@database' }, async function () {
  // Setup database for scenarios tagged with @database
});
```

## Best Practices

### 1. Write Declarative Scenarios

❌ **Imperative (How)**:

```gherkin
When I click the username field
And I type "john@example.com"
And I click the password field
And I type "password123"
And I click the submit button
```

✅ **Declarative (What)**:

```gherkin
When I log in with credentials "john@example.com" and "password123"
```

### 2. Keep Scenarios Focused

Each scenario should test one specific behavior.

### 3. Use Background for Common Setup

```gherkin
Background:
  Given the user is authenticated
  And the database is in a clean state
```

### 4. Make Scenarios Independent

Each scenario should be able to run in isolation.

### 5. Use Meaningful Tags

```gherkin
@critical @api @authentication
Scenario: JWT token validation
```

### 6. Keep Step Definitions Reusable

Write generic step definitions that can be reused across scenarios.

### 7. Use Scenario Outlines for Data Variations

When testing multiple inputs/outputs, use Examples tables.

## Development Workflow

### BDD-First Approach

1. **Write Feature File**: Define behavior in Gherkin
2. **Run Cucumber**: See pending steps
3. **Implement Step Definitions**: Connect Gherkin to code
4. **Implement Feature**: Make scenarios pass
5. **Refactor**: Clean up code while keeping tests green

### Example Workflow

```bash
# 1. Create feature file
cat > features/new-feature.feature << 'EOF'
Feature: New Feature
  Scenario: Test new functionality
    Given precondition
    When action
    Then outcome
EOF

# 2. Run Cucumber (will show undefined steps)
pnpm test:bdd features/new-feature.feature

# 3. Copy generated step snippets
# 4. Implement step definitions
# 5. Implement feature code
# 6. Run again until green
```

## Continuous Integration

Cucumber tests run in CI alongside unit/integration tests:

```yaml
# .github/workflows/test.yml
- name: Run BDD Tests
  run: |
    cd apps/backend
    pnpm test:bdd
```

## Reports

### HTML Report

```bash
pnpm test:bdd:report
# Opens reports/cucumber-report.html
```

### JSON Report

Cucumber generates JSON reports that can be consumed by CI tools:

```bash
cucumber-js --format json:reports/cucumber-report.json
```

## Tags Strategy

### Status tags (required)

Every `Scenario` / `Scenario Outline` must include at least one status tag so we can treat the feature files as both requirements and a status dashboard.

| Tag       | Meaning                                   | When to use                                                                                     | Expectations                                                                                                             |
| --------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@wip`    | Requirement captured, not implemented yet | The scenario is the spec/acceptance criteria but isn’t passing in automation                    | Default BDD runs should _not_ execute it; steps may be missing; keep it up-to-date as the requirement evolves            |
| `@ready`  | Implemented and runnable                  | The scenario is automated and should pass deterministically                                     | Must be stable in CI, not flaky, and not depend on manual setup; steps + assertions exist                                |
| `@manual` | Tracked requirement, validated manually   | Automation is not worth it yet (or not feasible) but we still want explicit acceptance criteria | Must include clear Given/When/Then and manual verification notes in steps/text; should not be part of automated CI gates |
| `@skip`   | Temporarily disabled                      | The scenario _used to_ run or is blocked temporarily                                            | Use sparingly; include a short reason in a comment near the tag and remove ASAP; should not become “permanent WIP”       |

Promotion guideline:

- Promote `@wip`  `@ready` only when the scenario has real step definitions, asserts meaningful outcomes (not just “Then it works”), and runs deterministically in CI.
- Use `@manual` when you want the requirement tracked but you explicitly accept it won’t run in CI.
- Use `@skip` for short-lived suppression (e.g., external outage, known flaky path) with a documented follow-up.

### Suite/attribute tags (optional)

| Tag           | Purpose                   |
| ------------- | ------------------------- |
| `@smoke`      | Critical paths, run first |
| `@regression` | Regression suite          |
| `@api`        | API tests                 |
| `@frontend`   | Frontend tests            |
| `@security`   | Security-focused tests    |
| `@slow`       | Long-running tests        |
| `@flaky`      | Known flaky tests to fix  |

## Debugging

### Run specific scenario by line number

```bash
pnpm test:bdd features/api.feature:23
```

### Verbose output

```bash
pnpm test:bdd -- --format-options '{"snippetInterface": "async-await"}'
```

### Dry run (check syntax without running)

```bash
pnpm test:bdd -- --dry-run
```

## Resources

- [Cucumber Documentation](https://cucumber.io/docs)
- [Gherkin Reference](https://cucumber.io/docs/gherkin/reference/)
- [Cucumber Expressions](https://github.com/cucumber/cucumber-expressions)
- [BDD Best Practices](https://cucumber.io/docs/bdd/)

## Migration from Plan-Based to BDD

Previously, we followed a sequential implementation plan. Now:

- ✅ **All requirements are captured as Cucumber scenarios**
- ✅ **Scenarios serve as acceptance criteria**
- ✅ **Implementation is driven by making scenarios pass**
- ✅ **Documentation stays in sync with reality**

## Getting Help

Run Cucumber with `--help` for all options:

```bash
npx cucumber-js --help
```

## Next Steps

1. Review existing feature files in `features/` directory
2. Run existing scenarios to see current state
3. Implement missing step definitions
4. Add new scenarios for new features
5. Keep scenarios green as codebase evolves
