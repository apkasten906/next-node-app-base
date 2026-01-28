@e2e @error-handling
@wip
Feature: Error Handling and Recovery
  As a user
  I want errors to be handled gracefully
  So that I understand what went wrong and how to recover

  Background:
    Given the application is running

  @boundary @critical
  Scenario: Global error boundary catches errors
    Given I am on the application
    When a component throws an unexpected error
    Then I should see a user-friendly error page
    And the error should be logged to the error tracking service
    And I should have an option to reload the page
    And I should have an option to go back to home

  @404
  Scenario: Handle 404 - Page not found
    When I navigate to a non-existent page "/this-does-not-exist"
    Then I should see a 404 error page
    And I should see a message "Page not found"
    And I should see navigation options to go home

  @403
  Scenario: Handle 403 - Forbidden access
    Given I am signed in as a regular user
    When I try to access an admin-only page
    Then I should see a 403 error page
    And I should see a message "Access denied"
    And I should be offered to contact support

  @401
  Scenario: Handle 401 - Unauthorized access
    Given my session has expired
    When I try to access a protected page
    Then I should be redirected to sign-in page
    And I should see a message "Please sign in to continue"
    And after signing in, I should be redirected to the original page

  @500
  Scenario: Handle 500 - Server error
    Given the API returns a 500 error
    When I try to load a page
    Then I should see a server error page
    And I should see a message "Something went wrong on our end"
    And I should have an option to retry
    And the error should be reported to monitoring

  @network
  Scenario: Handle network connection loss
    Given I am browsing the application
    When my internet connection is lost
    Then I should see an offline indicator
    And I should see a message "You are currently offline"
    When my connection is restored
    Then the offline indicator should disappear
    And data should be synchronized

  @form-errors
  Scenario: Display inline form validation errors
    Given I am on a form page
    When I submit the form with invalid data
    Then each invalid field should show an inline error
    And the first invalid field should be focused
    And the form should not be submitted

  @api-errors
  Scenario: Handle API validation errors
    Given I am creating a resource
    When the API returns validation errors
    Then each error should be mapped to the correct field
    And I should see all errors simultaneously
    And errors should be cleared when I fix the field

  @timeout
  Scenario: Handle request timeout
    Given the API is slow
    When a request takes longer than the timeout
    Then I should see a timeout error
    And I should have options to retry or cancel

  @retry
  Scenario: Automatic retry on transient errors
    Given the API returns a temporary error (503)
    When I make a request
    Then the request should be automatically retried
    And I should see a "Retrying..." indicator
    And it should retry up to 3 times with exponential backoff

  @toast
  Scenario: Display error notifications as toasts
    Given I am using the application
    When an error occurs during an action
    Then I should see an error toast notification
    And the toast should auto-dismiss after 5 seconds
    And I should be able to manually dismiss it

  @recovery
  Scenario: Error recovery with action retry
    Given an API request failed
    When I see the error message
    Then I should have a "Retry" button
    When I click "Retry"
    Then the failed action should be attempted again

  @partial-failure
  Scenario: Handle partial bulk operation failures
    Given I am deleting 10 resources in bulk
    When 3 deletions fail and 7 succeed
    Then I should see a message "7 of 10 resources deleted"
    And I should see details of which items failed
    And I should have an option to retry failed items

  @file-upload-error
  Scenario: Handle file upload errors
    Given I am uploading a file
    When the upload fails due to network error
    Then I should see an error message
    And I should have an option to retry upload
    And my file selection should be preserved

  @concurrent-edit
  Scenario: Handle concurrent edit conflicts
    Given I am editing a resource
    And another user edits the same resource
    When I try to save my changes
    Then I should see a conflict warning
    And I should see what changed
    And I should have options to overwrite or merge

  @session-expiry
  Scenario: Handle session expiry during operation
    Given I am in the middle of filling a form
    When my session expires
    Then my form data should be preserved
    And I should see a session expired message
    When I sign in again
    Then I should return to the form
    And my data should still be there

  @javascript-error
  Scenario: Catch and report JavaScript errors
    Given I am using the application
    When a JavaScript error occurs
    Then the application should not crash
    And the error should be sent to Sentry
    And I should see a graceful error message
    And the rest of the application should continue working

  @websocket-error
  Scenario: Handle WebSocket connection errors
    Given I am on a page using WebSocket
    When the WebSocket fails to connect
    Then I should see a connection error indicator
    And the app should fall back to polling
    And I should be notified that real-time features are limited

  @quota-exceeded
  Scenario: Handle storage quota exceeded
    Given I am uploading files
    When my storage quota is exceeded
    Then I should see a clear error message
    And I should see my current usage
    And I should have options to upgrade or delete files

  @browser-compatibility
  Scenario: Handle unsupported browser features
    Given I am using an older browser
    When I access a feature requiring modern APIs
    Then I should see a polite message about browser support
    And I should be offered a download link for modern browsers
    And basic functionality should still work

  @error-boundaries
  Scenario: Nested error boundaries isolate failures
    Given I am on a complex page with multiple components
    When one component fails
    Then only that component should show an error
    And the rest of the page should continue working
    And I should be able to interact with other components

  @error-logging
  Scenario: Errors include helpful context
    Given an error occurs
    Then the error log should include user ID
    And the error log should include current route
    And the error log should include user actions leading to error
    And the error log should include browser information

  @accessibility
  Scenario: Error messages are accessible
    Given I am using a screen reader
    When an error occurs
    Then the error message should be announced
    And error regions should have proper ARIA roles
    And keyboard focus should move to the error
