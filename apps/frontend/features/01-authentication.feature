@e2e @authentication
Feature: User Authentication
  As a user
  I want to authenticate with the application
  So that I can access protected features

  Background:
    Given the application is running
    And the database is seeded with test data

  @critical
  Scenario: Successful sign in with valid credentials
    Given I am on the sign-in page
    When I enter valid credentials
      | email    | test@example.com |
      | password | Test123!         |
    And I click the "Sign In" button
    Then I should be redirected to the dashboard
    And I should see a welcome message
    And the authentication token should be stored

  @critical
  Scenario: Sign in fails with invalid credentials
    Given I am on the sign-in page
    When I enter invalid credentials
      | email    | test@example.com |
      | password | WrongPassword    |
    And I click the "Sign In" button
    Then I should see an error message "Invalid credentials"
    And I should remain on the sign-in page
    And no authentication token should be stored

  @validation
  Scenario: Sign in form validates required fields
    Given I am on the sign-in page
    When I click the "Sign In" button without entering credentials
    Then I should see validation errors
      | field    | message                 |
      | email    | Email is required       |
      | password | Password is required    |

  @validation
  Scenario: Sign in form validates email format
    Given I am on the sign-in page
    When I enter an invalid email format "notanemail"
    And I click the "Sign In" button
    Then I should see an error message "Invalid email format"

  @security
  Scenario: Account lockout after multiple failed attempts
    Given I am on the sign-in page
    When I attempt to sign in with wrong password 5 times
    Then I should see an error message "Account locked due to too many failed attempts"
    And I should not be able to sign in for 15 minutes

  @session
  Scenario: User session persists across page refresh
    Given I am signed in as a user
    When I refresh the page
    Then I should still be authenticated
    And I should see my user dashboard

  @session
  Scenario: User can sign out successfully
    Given I am signed in as a user
    When I click the "Sign Out" button
    Then I should be redirected to the sign-in page
    And my authentication token should be cleared
    And I should not have access to protected pages

  @oauth
  Scenario: Sign in with OAuth provider
    Given I am on the sign-in page
    When I click "Sign in with Google"
    Then I should be redirected to Google OAuth page
    When I authorize the application
    Then I should be redirected back to the application
    And I should be signed in
    And my profile should be populated with OAuth data

  @token
  Scenario: Token refresh works automatically
    Given I am signed in as a user
    And my access token is about to expire
    When I make an authenticated API request
    Then my token should be automatically refreshed
    And the request should succeed

  @security
  Scenario: Expired token redirects to sign-in
    Given I am signed in as a user
    And my refresh token has expired
    When I try to access a protected page
    Then I should be redirected to the sign-in page
    And I should see a message "Session expired, please sign in again"

  @responsive
  Scenario: Authentication works on mobile devices
    Given I am using a mobile device
    And I am on the sign-in page
    When I enter valid credentials
    And I click the "Sign In" button
    Then I should be successfully authenticated
    And the mobile navigation should be displayed

  @accessibility
  Scenario: Sign-in form is keyboard accessible
    Given I am on the sign-in page
    When I navigate the form using only keyboard
    Then I should be able to focus on all form fields
    And I should be able to submit the form using Enter key
    And I should be able to navigate between fields using Tab key
