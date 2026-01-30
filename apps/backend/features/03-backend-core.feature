@wip
Feature: Backend Core Services
  As a backend developer
  We need core services for database, caching, and logging
  So that we can build robust and performant APIs

  Background:
    Given the backend application is running
    And environment variables are configured

  @backend @express
  Scenario: Express server initialization
    Given Express is configured with middleware
    When the server starts
    Then the server should listen on the configured port
    And middleware should be loaded in correct order
    And error handling should be configured

  @backend @database @prisma
  Scenario: Prisma ORM database connection
    Given Prisma is configured for PostgreSQL
    When the application connects to the database
    Then the connection should be established successfully
    And database models should be available
    And migrations should be up to date

  @backend @database @crud
  Scenario: Database CRUD operations
    Given a User model exists in the database
    When I create a new user with data:
      | field    | value               |
      | email    | test@example.com    |
      | name     | Test User           |
      | password | hashed_password     |
    Then the user should be saved to the database
    When I retrieve the user by email
    Then the user should be found
    And all fields should match
    When I update the user's name to "Updated User"
    Then the user's name should be updated in the database
    When I delete the user
    Then the user should be removed from the database

  @backend @cache @redis
  Scenario: Redis caching service
    Given Redis is configured and running
    When I set a cache key "test-key" with value "test-value"
    Then the value should be stored in Redis
    When I get the cache key "test-key"
    Then I should receive "test-value"
    When I set a cache key with TTL of 1 second
    And I wait for 2 seconds
    Then the cache key should be expired

  @backend @cache @invalidation
  Scenario: Cache invalidation strategies
    Given cached data exists for key "user:123"
    When the underlying data is updated
    Then the cache should be invalidated
    And the next read should fetch fresh data
    And the fresh data should be cached

  @backend @logging @winston
  Scenario: Winston logging service
    Given Winston is configured with multiple transports
    When I log a message at level "<level>"
    Then the message should be written to the console
    And the message should be written to the log file
    And the log format should include timestamp and level

    Examples:
      | level |
      | info  |
      | warn  |
      | error |
      | debug |

  @backend @logging @correlation-id
  Scenario: Request correlation ID tracking
    Given correlation ID middleware is enabled
    When I make an API request
    Then a correlation ID should be generated
    And the correlation ID should be included in response headers
    And all logs for this request should include the correlation ID

  @backend @error-handling
  Scenario: Global error handling middleware
    Given global error handler is configured
    When an unhandled error occurs in a route
    Then the error should be caught by the error handler
    And a 500 status code should be returned
    And error details should be logged
    And in production, stack traces should be hidden

  @backend @health-check
  Scenario: Health check endpoint
    Given the application is running
    When I request GET "/health"
    Then the response status should be 200
    And the response should contain:
      | field     |
      | uptime    |
      | timestamp |
      | status    |

  @backend @readiness-check
  Scenario: Readiness check with dependencies
    Given the application is running
    And database is connected
    And Redis is connected
    When I request GET "/ready"
    Then the response status should be 200
    And the response should indicate "ready" status
    And database health should be "true"
    And cache health should be "true"

  @backend @readiness-check @failure
  Scenario: Readiness check when dependencies fail
    Given the application is running
    And database is disconnected
    When I request GET "/ready"
    Then the response status should be 503
    And the response should indicate "not ready" status
    And database health should be "false"

  @backend @middleware @compression
  Scenario: Response compression middleware
    Given compression middleware is enabled
    When I request a large JSON response
    Then the response should be compressed
    And the Content-Encoding header should be "gzip"

  @backend @middleware @cors
  Scenario: CORS middleware configuration
    Given CORS is configured for allowed origins
    When I make a preflight OPTIONS request
    Then CORS headers should be present
    And allowed methods should be specified
    And credentials should be allowed for trusted origins

  @ready @backend @webhooks
  Scenario: Webhook event publishing
    Given a webhook service is configured
    And a webhook subscriber is registered for event "<event>"
    When I publish a webhook event "<event>" with payload
    Then the webhook should be delivered to the subscriber
    And the delivery should be retried on failure
    And webhook delivery should be logged

    Examples:
      | event           |
      | user.created    |
      | user.updated    |
      | order.completed |

  @ready @backend @webhooks @security
  Scenario: Webhook signature verification
    Given webhooks have signature verification enabled
    When a webhook is received with a valid signature
    Then the webhook should be processed
    When a webhook is received with an invalid signature
    Then the webhook should be rejected
    And an error should be logged

  @backend @database @transactions
  Scenario: Database transactions for atomic operations
    Given multiple database operations need to be atomic
    When I start a transaction
    And I perform multiple database writes
    And all operations succeed
    Then I commit the transaction
    And all changes should be persisted
    When any operation fails
    Then I rollback the transaction
    And no changes should be persisted

  @backend @database @soft-delete
  Scenario: Soft delete implementation
    Given a User model with soft delete support
    When I soft delete a user
    Then the user should be marked as deleted
    And the deletedAt timestamp should be set
    But the user record should still exist in database
    When I query for active users
    Then the soft deleted user should not be included

  @backend @middleware @request-validation
  Scenario: Request body validation
    Given request validation middleware is configured
    When I POST to "/api/users" with invalid data
    Then the request should be rejected
    And a 400 status code should be returned
    And validation errors should be detailed in the response

  @backend @graceful-shutdown
  Scenario: Graceful server shutdown
    Given the server is running with active connections
    When a shutdown signal is received
    Then the server should stop accepting new connections
    And existing connections should be allowed to complete
    And database connections should be closed
    And Redis connections should be closed
    And the process should exit cleanly
