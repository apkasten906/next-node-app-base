Feature: Project Foundation and Governance
  As a development team
  We need a solid monorepo foundation with code quality standards
  So that we can build scalable and maintainable applications

  Background:
    Given the project is initialized with Turborepo
    And pnpm workspaces are configured

  @foundation @monorepo
  Scenario: Turborepo monorepo structure
    Given I am in the project root directory
    When I check the project structure
    Then I should see "apps/backend" directory
    And I should see "apps/frontend" directory
    And I should see "packages/types" directory
    And I should see "turbo.json" configuration file
    And I should see "pnpm-workspace.yaml" configuration file

  @foundation @linting
  Scenario: ESLint configuration across workspaces
    Given ESLint is configured for the monorepo
    When I run ESLint on all packages
    Then all TypeScript files should pass linting rules
    And shared ESLint configuration should be used

  @foundation @formatting
  Scenario: Prettier code formatting
    Given Prettier is configured
    When I check code formatting
    Then all files should follow Prettier rules
    And formatting should be consistent across all packages

  @foundation @git-hooks
  Scenario: Husky Git hooks for commit validation
    Given Husky is installed and configured
    When I make a Git commit
    Then pre-commit hooks should run linting
    And pre-commit hooks should run formatting checks
    And commit-msg hook should validate commit message format

  @foundation @commitlint
  Scenario: Conventional commits enforcement
    Given commitlint is configured
    When I attempt to commit with message "<message>"
    Then the commit should be "<result>"

    Examples:
      | message                          | result   |
      | feat: add new feature            | accepted |
      | fix: resolve bug                 | accepted |
      | docs: update documentation       | accepted |
      | invalid commit message           | rejected |
      | WIP: work in progress            | rejected |

  @foundation @typescript
  Scenario: Strict TypeScript configuration
    Given TypeScript is configured in strict mode
    When I compile TypeScript code
    Then no type errors should exist
    And strict null checks should be enabled
    And no implicit any should be allowed

  @foundation @dependencies
  Scenario: Dependency management with pnpm
    Given pnpm is used as the package manager
    When I install dependencies
    Then dependencies should be hoisted correctly
    And peer dependencies should be satisfied
    And there should be no duplicate packages

  @foundation @scripts
  Scenario: Unified npm scripts across workspaces
    Given package.json scripts are defined
    When I run "pnpm build"
    Then all workspace packages should build successfully
    When I run "pnpm lint"
    Then all workspace packages should be linted
    When I run "pnpm test"
    Then all workspace tests should execute
