@wip
Feature: Message Queue System with BullMQ
  As a backend developer
  We need a reliable message queue system
  So that we can handle asynchronous jobs with retry and monitoring

  Background:
    Given Redis is running and accessible
    And QueueService is initialized
    And Bull Board dashboard is configured

  @ready @queue @email @impl_queue_system
  Scenario: Queue email notification job
    Given email queue is configured
    When I add an email job with recipient "user@example.com"
    Then the job should be queued successfully
    And the job should have a unique job ID
    And the job should be visible in Bull Board dashboard

  @queue @email @processing
  Scenario: Process email job successfully
    Given email queue has a pending job
    When the EmailProcessor processes the job
    Then the job should complete successfully
    And the job status should be "completed"
    And completion time should be recorded

  @queue @email @retry
  Scenario: Retry failed email job
    Given email queue has a failing job
    And retry strategy is configured with 3 attempts
    When the EmailProcessor fails to process the job
    Then the job should be retried automatically
    And retry count should increment
    And backoff delay should be exponential

  @ready @queue @sms @impl_queue_system
  Scenario: Queue SMS notification job
    Given SMS queue is configured
    When I add an SMS job with phone "+1234567890"
    Then the job should be queued successfully
    And the job should respect rate limits

  @ready @queue @webhook @impl_queue_system
  Scenario: Queue webhook delivery job
    Given webhook queue is configured
    When I add a webhook job with URL "https://api.example.com/webhook"
    Then the job should be queued successfully
    And the job should include payload and headers

  @ready @queue @file-processing @impl_queue_system
  Scenario: Queue file processing job
    Given file-processing queue is configured
    When I add a file processing job for "document.pdf"
    Then the job should be queued successfully
    And the job should include file metadata

  @ready @queue @monitoring @impl_queue_system
  Scenario: Bull Board dashboard route is configured
    Given Bull Board dashboard is configured
    Then the queue monitoring dashboard should be available at "/admin/queues"

  @queue @monitoring
  Scenario: View queue metrics in Bull Board
    Given Bull Board dashboard is enabled
    And queues have active and completed jobs
    When I access "/admin/queues"
    Then I should see all configured queues
    And I should see job counts per queue
    And I should see active, completed, and failed jobs

  @queue @management
  Scenario: Pause and resume queue
    Given email queue is active
    When I pause the email queue
    Then new jobs should not be processed
    And existing jobs should wait
    When I resume the email queue
    Then jobs should start processing again

  @queue @management
  Scenario: Clean completed jobs
    Given email queue has 100 completed jobs
    When I clean completed jobs older than 24 hours
    Then old completed jobs should be removed
    And recent completed jobs should remain

  @queue @management
  Scenario: Drain queue
    Given email queue has pending jobs
    When I drain the email queue
    Then all pending jobs should be removed
    And active jobs should complete normally

  @queue @rate-limiting
  Scenario: Respect concurrency limits
    Given email queue has concurrency limit of 5
    When 10 jobs are queued simultaneously
    Then only 5 jobs should process concurrently
    And remaining jobs should wait in queue

  @queue @rate-limiting
  Scenario: Respect rate limits per minute
    Given webhook queue has rate limit of 100 jobs/minute
    When 150 jobs are queued in one minute
    Then only 100 jobs should process in first minute
    And 50 jobs should process in second minute

  @queue @error-handling
  Scenario: Handle processor errors gracefully
    Given email queue has a job
    And EmailProcessor throws an error
    When the job is processed
    Then the error should be logged
    And the job should move to failed state
    And retry should be attempted if configured

  @queue @integration
  Scenario: Queue system integrates with NotificationService
    Given NotificationService is configured
    And QueueService is available
    When NotificationService sends an email
    Then the email should be queued automatically
    And fallback to direct send if queue unavailable

  @queue @data-export
  Scenario: Queue data export job
    Given data-export queue is configured
    When I request a CSV export of user data
    Then the export job should be queued
    And the job should include export parameters
    And progress should be tracked

  @queue @cleanup
  Scenario: Queue cleanup job
    Given cleanup queue is configured
    When I schedule a cleanup job for expired sessions
    Then the job should be queued with schedule
    And the job should execute at specified time

  @queue @priority
  Scenario: Process high-priority jobs first
    Given email queue has jobs with different priorities
    When I add a high-priority job
    Then the high-priority job should process before normal jobs
    And job order should respect priority levels
