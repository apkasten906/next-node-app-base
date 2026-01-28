@wip
Feature: Testing Infrastructure
  As a quality-focused development team
  We need comprehensive testing infrastructure
  So that we can ensure code quality and prevent regressions

  Background:
    Given testing frameworks are installed and configured

  @testing @vitest @unit
  Scenario: Vitest unit testing for backend
    Given Vitest is configured for unit tests
    When I run unit tests for a service
    Then all tests should execute
    And test coverage should be calculated
    And coverage reports should be generated

  @testing @vitest @integration
  Scenario: Integration testing with Vitest
    Given integration tests are defined
    When I run integration tests
    Then database connections should be mocked or use test database
    And external APIs should be mocked
    And tests should run in isolation

  @testing @playwright @e2e
  Scenario: Playwright E2E testing
    Given Playwright is configured for E2E tests
    When I run E2E tests for user flow "<flow>"
    Then the tests should run in real browser
    And screenshots should be captured on failure
    And test results should be reported

    Examples:
      | flow              |
      | user registration |
      | user login        |
      | dashboard access  |

  @testing @e2e @seeding
  Scenario: Deterministic E2E seeding via HTTP endpoint
    Given the backend exposes a dev-only seed endpoint at "POST /api/e2e/seed"
    And the endpoint is blocked when NODE_ENV is "production"
    And the endpoint requires header "x-e2e-seed-token" matching "E2E_SEED_TOKEN"
    When Playwright global setup calls the seed endpoint once before tests
    Then persona users should be upserted idempotently
    And E2E tests should not rely on manual database setup
    And the seeded state should be consistent across runs

  @testing @coverage
  Scenario: Code coverage thresholds
    Given coverage thresholds are configured
    When I run tests with coverage
    Then line coverage should be at least 80%
    And branch coverage should be at least 75%
    And function coverage should be at least 80%

  @testing @supertest
  Scenario: API endpoint testing with Supertest
    Given Supertest is configured for API testing
    When I test POST "/api/users" endpoint
    Then I should be able to send test requests
    And I should receive responses
    And I should assert on status codes and body

  @testing @mocking
  Scenario: Service mocking and stubbing
    Given a service depends on external dependencies
    When I write unit tests for the service
    Then I should mock external dependencies
    And the service should work with mocked data
    And tests should not depend on external services

  @testing @fixtures
  Scenario: Test data fixtures
    Given test fixtures are defined
    When I run tests that need sample data
    Then fixtures should be loaded
    And tests should use consistent test data
    And fixtures should be cleaned up after tests

  @testing @snapshot
  Scenario: Snapshot testing for UI components
    Given snapshot tests are configured
    When I render a component
    Then a snapshot should be created
    When component output changes
    Then snapshot tests should fail
    And developers should review and update snapshots

  @testing @parallel
  Scenario: Parallel test execution
    Given test suite has multiple test files
    When I run tests in parallel mode
    Then tests should execute concurrently
    And execution time should be reduced
    And tests should not interfere with each other

  @testing @watch-mode
  Scenario: Watch mode for development
    Given watch mode is enabled
    When I change a source file
    Then related tests should re-run automatically
    And only affected tests should execute
    And I should see immediate feedback
