@wip
Feature: Frontend Core Features
  As a frontend developer
  We need robust frontend architecture with state management and error handling
  So that we can build maintainable user interfaces

  Background:
    Given the Next.js application is running
    And frontend is configured

  @frontend @msw
  Scenario: Mock Service Worker for API mocking
    Given MSW is configured for development
    When I make an API request in development mode
    Then the request should be intercepted by MSW
    And a mocked response should be returned
    And no actual backend request should be made

  @frontend @msw @handlers
  Scenario: MSW request handlers
    Given MSW handlers are defined for "/api/users"
    When I GET "/api/users" in the browser
    Then MSW should return mocked user data
    And the response should match the handler definition

  @frontend @api-client
  Scenario: Type-safe API client
    Given a type-safe API client is configured
    When I make an API request using the client
    Then request payload should be type-checked
    And response should be strongly typed
    And TypeScript should catch type errors

  @frontend @api-client @error-handling @impl_frontend_error_handling
  @ready
  Scenario: API client error handling
    Given the API client is configured
    When an API request fails with status "<status>"
    Then the error should be properly typed
    And error message should be extracted
    And error should be propagated to caller

    Examples:
      | status |
      | 400    |
      | 401    |
      | 404    |
      | 500    |

  @frontend @error-boundary @impl_frontend_error_handling
  @ready
  Scenario: React error boundary
    Given an error boundary is configured
    When a component throws an error
    Then the error should be caught by error boundary
    And a fallback UI should be displayed
    And the error should be logged

  @frontend @websocket @ready @impl_frontend_websocket_hook
  Scenario: WebSocket hook wiring
    Given the WebSocket hook is implemented
    Then it should use socket.io-client
    And it should default to NEXT_PUBLIC_WEBSOCKET_URL
    And it should support reconnection state transitions

  @frontend @error-boundary @recovery
  Scenario: Error boundary recovery
    Given an error boundary with retry functionality
    When a component errors and user clicks retry
    Then the error boundary should reset
    And the component should be re-rendered
    And the error state should be cleared

  @frontend @feature-flags
  Scenario: Feature flag system
    Given feature flags are configured
    When I check if feature "<feature>" is enabled
    Then the system should return "<enabled>"
    And UI should conditionally render based on flag

    Examples:
      | feature           | enabled |
      | newDashboard      | true    |
      | experimentalUI    | false   |
      | betaFeatures      | false   |

  @frontend @feature-flags @user-targeting
  Scenario: User-targeted feature flags
    Given feature flags support user targeting
    When a user with role "beta-tester" checks feature "betaFeatures"
    Then the feature should be enabled for this user
    When a regular user checks the same feature
    Then the feature should be disabled

  @frontend @loading-states
  Scenario: Loading state management
    Given a component fetches data from API
    When the API request is in progress
    Then a loading spinner should be displayed
    When the request completes
    Then the loading state should be removed
    And data should be displayed

  @frontend @optimistic-updates
  Scenario: Optimistic UI updates
    Given optimistic updates are configured
    When a user performs an action that updates server data
    Then the UI should update immediately
    And the update should be sent to server in background
    When server confirms the update
    Then UI should remain updated
    When server rejects the update
    Then UI should rollback to previous state

  @frontend @infinite-scroll
  Scenario: Infinite scroll pagination
    Given a list component with infinite scroll
    When the user scrolls to the bottom
    Then next page of data should be fetched
    And new items should be appended to the list
    And loading indicator should be shown during fetch

  @frontend @debouncing
  Scenario: Search input debouncing
    Given a search input with 300ms debounce
    When a user types quickly
    Then API requests should be debounced
    And only the final input value should trigger search
    And excessive API calls should be prevented

  @frontend @caching @query
  Scenario: TanStack Query caching
    Given TanStack Query is configured
    When I fetch data for a query
    Then the data should be cached
    When I request the same data again
    Then cached data should be returned immediately
    And background refetch should occur

  @frontend @caching @invalidation
  Scenario: Query cache invalidation
    Given cached query data exists
    When data is mutated on the server
    Then the relevant queries should be invalidated
    And data should be refetched
    And UI should update with fresh data

  @frontend @offline
  Scenario: Offline detection and handling
    Given offline detection is enabled
    When the user goes offline
    Then the app should detect offline state
    And offline indicator should be displayed
    And user should be notified
    When the user comes back online
    Then online state should be detected
    And pending requests should be retried

  @frontend @accessibility @aria
  Scenario: ARIA labels and semantic HTML
    Given components use semantic HTML
    When I inspect a button component
    Then it should have appropriate ARIA labels
    And role should be properly defined
    And keyboard navigation should work

  @frontend @accessibility @focus-management
  Scenario: Focus management for modals
    Given a modal dialog component
    When the modal opens
    Then focus should move to the modal
    And focus should be trapped within modal
    When the modal closes
    Then focus should return to trigger element

  @frontend @accessibility @keyboard
  Scenario: Keyboard navigation
    Given interactive components exist
    When I navigate using Tab key
    Then all interactive elements should be reachable
    And tab order should be logical
    And Enter/Space should activate elements

  @frontend @forms @validation
  Scenario: Form validation
    Given a form with validation rules
    When I submit invalid data
    Then validation errors should be displayed
    And form should not submit
    When I correct the errors
    Then validation should pass
    And form should submit successfully

  @frontend @forms @async-validation
  Scenario: Async form validation
    Given a form with async validation (e.g., email uniqueness)
    When I enter an email address
    Then async validation should run
    And validation status should be indicated
    And user should wait for validation result

  @frontend @toast-notifications
  Scenario: Toast notification system
    Given a toast notification system is configured
    When a user action succeeds
    Then a success toast should be displayed
    And the toast should auto-dismiss after 5 seconds
    When a user action fails
    Then an error toast should be displayed
