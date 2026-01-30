@wip
Feature: Advanced Testing Strategies
  As a quality assurance engineer
  We need advanced testing strategies
  So that we can ensure comprehensive quality coverage

  Background:
    Given advanced testing tools are configured

  @testing @bdd @cucumber
  Scenario: Cucumber BDD testing
    Given Cucumber feature files are written
    When I run Cucumber tests
    Then scenarios should be executed
    And step definitions should be matched
    And test results should be reported in Gherkin format

  @testing @bdd @living-documentation
  Scenario: Living documentation from Cucumber
    Given Cucumber scenarios are defined
    When tests pass
    Then scenarios serve as living documentation
    And business stakeholders can read scenarios
    And scenarios stay in sync with implementation

  @testing @security @owasp-zap
  Scenario: OWASP ZAP security scanning
    Given OWASP ZAP is configured
    When I run a security scan against the application
    Then common vulnerabilities should be detected:
      | vulnerability        |
      | SQL Injection        |
      | XSS                  |
      | CSRF                 |
      | Insecure Headers     |
    And scan report should be generated

  @testing @security @dependency-scan
  Scenario: Dependency vulnerability scanning
    Given dependency scanning is configured
    When I scan project dependencies
    Then known vulnerabilities should be reported
    And severity levels should be assigned
    And remediation suggestions should be provided

  @testing @load @k6
  Scenario: Load testing with k6
    Given k6 load test scripts are defined
    When I run load tests with 100 virtual users
    Then the application should handle the load
    And response times should be measured
    And error rates should be tracked
    And throughput should be calculated

  @testing @load @ramp-up
  Scenario: Gradual load ramp-up
    Given a k6 script with ramping stages
    When I run the load test
    Then load should ramp up gradually:
      | duration | users |
      | 1m       | 10    |
      | 3m       | 50    |
      | 5m       | 100   |
      | 2m       | 0     |
    And system behavior should be observed at each stage

  @testing @load @thresholds
  Scenario: k6 performance thresholds
    Given performance thresholds are defined
    When load tests run
    Then response time p95 should be < 500ms
    And response time p99 should be < 1000ms
    And error rate should be < 1%
    And successful requests should be > 95%

  @testing @contract @pact
  Scenario: Consumer-driven contract testing with Pact
    Given Pact contracts are defined
    When consumer tests run
    Then contracts should be generated
    When provider tests run
    Then provider should verify contracts
    And compatibility should be ensured

  @testing @contract @breaking-changes
  Scenario: Contract breaking change detection
    Given a Pact contract exists between consumer and provider
    When provider changes API in incompatible way
    Then contract verification should fail
    And breaking changes should be reported
    And deployment should be blocked

  @testing @visual-regression
  Scenario: Visual regression testing
    Given baseline screenshots exist
    When I run visual regression tests
    Then current screenshots should be compared to baseline
    And visual differences should be highlighted
    And tests should fail if differences exceed threshold

  @testing @accessibility @axe
  Scenario: Automated accessibility testing with axe-core
    Given axe-core is integrated in tests
    When I test a page for accessibility
    Then WCAG violations should be detected
    And violations should be categorized by severity
    And remediation guidance should be provided

  @testing @mutation
  Scenario: Mutation testing for test quality
    Given mutation testing is configured
    When I run mutation tests
    Then code should be mutated in various ways
    And test suite should catch mutations
    And mutation score should indicate test quality

  @testing @smoke
  Scenario: Smoke test suite for quick validation
    Given smoke tests are defined
    When I run smoke tests
    Then critical paths should be validated
    And tests should complete in < 2 minutes
    And deployment readiness should be determined

  @publishing @registry
  @ready
  Scenario: Registry-agnostic publish flow is wired
    Given a registry-agnostic publish script exists
    And an npmrc template exists for local publishing
    And a GitHub Actions publish workflow is configured
    Then the publish script should accept registry and token via environment variables
    And the publish workflow should run the publish script with a token

  @database @prisma @migrations
  @ready
  Scenario: Prisma 7 CLI migration workaround is documented and wired
    Given Prisma CLI configuration is maintained at the monorepo root
    And the backend Prisma schema should not embed a datasource URL
    And a manual SQL initialization script exists for Prisma migrations
    Then Docker build should generate Prisma client using the root prisma config
    And Docker Compose should apply migrations using the root prisma config
    And ADR-010 should document the Prisma 7 migration workaround

  @testing @regression
  Scenario: Regression test suite
    Given regression tests cover existing features
    When new code is deployed
    Then regression tests should run
    And existing functionality should be verified
    And no regressions should be introduced

  @testing @chaos
  Scenario: Chaos engineering experiments
    Given chaos engineering tools are configured
    When I inject failures randomly
    Then system resilience should be tested
    And recovery mechanisms should be validated
    And weak points should be identified

  @testing @monkey
  Scenario: Monkey testing for unexpected inputs
    Given monkey testing is configured
    When random actions are performed on UI
    Then the application should not crash
    And errors should be handled gracefully
    And unexpected behavior should be logged

  @testing @property-based
  Scenario: Property-based testing
    Given property-based tests are defined
    When tests run with generated inputs
    Then properties should hold for all inputs
    And edge cases should be discovered automatically
    And counterexamples should be minimized

  @testing @snapshot @approval
  Scenario: Approval testing for complex outputs
    Given approval tests are configured
    When complex output is generated
    Then output should match approved snapshot
    When output changes
    Then developers should review and approve changes

  @testing @test-data @factory
  Scenario: Test data factories
    Given test data factories are defined
    When tests need sample data
    Then factories should generate realistic data
    And data should be randomized but valid
    And related data should be consistent

  @testing @parallel @distributed
  Scenario: Distributed parallel test execution
    Given tests can run in parallel
    When I run tests across multiple machines
    Then tests should execute concurrently
    And results should be aggregated
    And total execution time should be reduced

  @testing @flaky-detection
  Scenario: Flaky test detection and management
    Given flaky test detection is enabled
    When a test fails intermittently
    Then the test should be flagged as flaky
    And flaky tests should be quarantined
    And developers should be notified to fix flaky tests
