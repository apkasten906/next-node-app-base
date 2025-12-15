@e2e @api-integration
Feature: API Integration and Data Management
  As an authenticated user
  I want to interact with API endpoints
  So that I can manage application data

  Background:
    Given the application is running
    And I am signed in as a user with admin privileges

  @crud @critical
  Scenario: Create new resource via UI
    Given I am on the resources page
    When I click the "Create New Resource" button
    And I fill in the resource form
      | field       | value                    |
      | name        | Test Resource            |
      | description | This is a test resource  |
      | category    | Testing                  |
    And I click the "Create" button
    Then I should see a success message "Resource created successfully"
    And the new resource should appear in the list
    And the resource should be persisted in the database

  @crud
  Scenario: Read and display resources list
    Given there are 25 resources in the database
    And I am on the resources page
    Then I should see a paginated list of resources
    And each resource should display name and description
    And pagination controls should be visible

  @crud
  Scenario: Update existing resource
    Given I have created a resource named "Original Resource"
    And I am on the resources page
    When I click "Edit" on the resource
    And I update the name to "Updated Resource"
    And I click the "Save" button
    Then I should see a success message "Resource updated successfully"
    And the resource should display the updated name

  @crud
  Scenario: Delete resource with confirmation
    Given I have created a resource named "To Delete"
    And I am on the resources page
    When I click "Delete" on the resource
    Then I should see a confirmation dialog
    When I confirm the deletion
    Then I should see a success message "Resource deleted successfully"
    And the resource should no longer appear in the list

  @search
  Scenario: Search resources by name
    Given there are multiple resources in the database
    And I am on the resources page
    When I enter "test" in the search field
    Then I should see only resources containing "test" in their name
    And the results should update in real-time

  @filter
  Scenario: Filter resources by category
    Given there are resources in different categories
    And I am on the resources page
    When I select "Testing" from the category filter
    Then I should see only resources in the "Testing" category
    And the count should match the filtered results

  @sort
  Scenario: Sort resources by different fields
    Given there are multiple resources in the database
    And I am on the resources page
    When I click the "Name" column header
    Then resources should be sorted alphabetically by name
    When I click the "Name" column header again
    Then resources should be sorted in reverse alphabetical order

  @pagination
  Scenario: Navigate through paginated results
    Given there are 50 resources in the database
    And I am on the resources page showing 10 items per page
    When I click "Next Page"
    Then I should see resources 11-20
    When I click "Page 3"
    Then I should see resources 21-30
    When I click "Previous Page"
    Then I should see resources 11-20

  @bulk
  Scenario: Bulk delete multiple resources
    Given I have selected 5 resources
    When I click the "Delete Selected" button
    Then I should see a confirmation dialog showing the count
    When I confirm the bulk deletion
    Then all 5 resources should be deleted
    And I should see a success message "5 resources deleted"

  @export
  Scenario: Export data to CSV
    Given there are resources in the database
    And I am on the resources page
    When I click the "Export" button
    And I select "CSV" format
    Then a CSV file should be downloaded
    And the file should contain all visible resources

  @validation
  Scenario: API validation errors are displayed
    Given I am on the create resource page
    When I submit the form with missing required fields
    Then I should see validation errors from the API
    And each field should display its specific error message

  @error-handling
  Scenario: Handle API timeout gracefully
    Given the API is slow to respond
    And I am creating a new resource
    When the request takes longer than 30 seconds
    Then I should see a timeout message
    And I should have the option to retry

  @error-handling
  Scenario: Handle network errors
    Given I am offline
    And I am on the resources page
    When I try to create a new resource
    Then I should see an offline message
    And my changes should be queued for when I come back online

  @optimistic-update
  Scenario: Optimistic UI updates
    Given I am on the resources page
    When I update a resource
    Then the UI should update immediately
    And if the API call fails, the change should be reverted
    And I should see an error notification

  @real-time
  Scenario: Receive real-time updates via WebSocket
    Given I am on the resources page
    And WebSocket connection is established
    When another user creates a new resource
    Then the new resource should appear in my list automatically
    And I should see a notification "New resource added"

  @real-time
  Scenario: Handle WebSocket disconnection
    Given I am on the resources page
    And WebSocket was connected
    When the WebSocket connection is lost
    Then I should see a "Connection lost" indicator
    When the connection is restored
    Then I should see a "Connection restored" message
    And data should be synchronized

  @rate-limiting
  Scenario: Handle API rate limiting
    Given I make rapid API requests
    When the rate limit is exceeded
    Then I should see a message "Too many requests, please slow down"
    And I should see when I can retry

  @caching
  Scenario: Utilize cached data for performance
    Given I have previously loaded the resources page
    When I navigate back to the resources page
    Then data should load from cache immediately
    And fresh data should be fetched in the background
    And the UI should update if data changed

  @versioning
  Scenario: API version compatibility
    Given I am using the application
    When the API version is updated
    Then the correct API version header should be sent
    And backward compatibility should be maintained

  @responsive
  Scenario: Data management on mobile devices
    Given I am using a mobile device
    When I perform CRUD operations
    Then all functionality should work correctly
    And the interface should be touch-optimized

  @accessibility
  Scenario: Data tables are accessible
    Given I am using a screen reader
    And I am on the resources page
    Then the data table should have proper ARIA labels
    And table headers should be announced
    And navigation should be keyboard accessible
