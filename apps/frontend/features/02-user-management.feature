@e2e @user-management
@wip
Feature: User Management
  As an authenticated user
  I want to manage my profile and settings
  So that I can control my account information

  Background:
    Given the application is running
    And I am signed in as a user

  @profile
  Scenario: View user profile
    Given I am on the dashboard
    When I click on my profile avatar
    Then I should see my profile information
      | field     | value              |
      | name      | Test User          |
      | email     | test@example.com   |
      | role      | user               |
      | joinedAt  | 2024-01-01         |

  @profile @critical
  Scenario: Update user profile successfully
    Given I am on the profile edit page
    When I update my profile information
      | field     | value                |
      | name      | Updated User Name    |
      | bio       | This is my new bio   |
    And I click the "Save Changes" button
    Then I should see a success message "Profile updated successfully"
    And my profile should be updated with the new information

  @validation
  Scenario: Profile update validates required fields
    Given I am on the profile edit page
    When I clear the "name" field
    And I click the "Save Changes" button
    Then I should see a validation error "Name is required"
    And my profile should not be updated

  @password
  Scenario: Change password successfully
    Given I am on the security settings page
    When I enter my current password "Test123!"
    And I enter new password "NewTest456!"
    And I confirm new password "NewTest456!"
    And I click the "Change Password" button
    Then I should see a success message "Password changed successfully"
    And I should be able to sign in with the new password

  @password @validation
  Scenario: Change password validates password strength
    Given I am on the security settings page
    When I enter my current password "Test123!"
    And I enter a weak new password "weak"
    And I click the "Change Password" button
    Then I should see an error message "Password must be at least 8 characters"

  @settings
  Scenario: Update notification preferences
    Given I am on the settings page
    When I toggle email notifications to "off"
    And I toggle push notifications to "on"
    And I click the "Save Preferences" button
    Then I should see a success message "Preferences saved"
    And my notification settings should be updated

  @language
  Scenario: Change application language
    Given I am on the dashboard
    When I click the language selector
    And I select "Español"
    Then the interface should be displayed in Spanish
    And my language preference should be saved
    When I refresh the page
    Then the interface should still be in Spanish

  @avatar
  Scenario: Upload profile avatar
    Given I am on the profile edit page
    When I click the "Upload Avatar" button
    And I select a valid image file
    Then I should see a preview of the image
    When I click "Confirm Upload"
    Then I should see a success message "Avatar uploaded successfully"
    And my new avatar should be displayed

  @avatar @validation
  Scenario: Avatar upload validates file type
    Given I am on the profile edit page
    When I try to upload a PDF file as avatar
    Then I should see an error message "Only image files are allowed"

  @avatar @validation
  Scenario: Avatar upload validates file size
    Given I am on the profile edit page
    When I try to upload an image larger than 5MB
    Then I should see an error message "File size must be less than 5MB"

  @2fa
  Scenario: Enable two-factor authentication
    Given I am on the security settings page
    When I click "Enable Two-Factor Authentication"
    Then I should see a QR code
    When I scan the QR code with my authenticator app
    And I enter the verification code
    And I click "Verify and Enable"
    Then I should see a success message "Two-factor authentication enabled"
    And I should see backup codes

  @2fa
  Scenario: Sign in with two-factor authentication
    Given two-factor authentication is enabled for my account
    And I am on the sign-in page
    When I enter valid credentials
    And I click the "Sign In" button
    Then I should see a 2FA code input
    When I enter a valid 2FA code
    And I click "Verify"
    Then I should be signed in successfully

  @account
  Scenario: Delete user account
    Given I am on the account settings page
    When I click "Delete Account"
    Then I should see a confirmation dialog
    When I enter my password to confirm
    And I click "Permanently Delete Account"
    Then my account should be deleted
    And I should be signed out
    And I should not be able to sign in with my credentials

  @sessions
  Scenario: View active sessions
    Given I am signed in on multiple devices
    When I go to the security settings page
    Then I should see a list of active sessions
    And each session should show device, location, and last active time

  @sessions
  Scenario: Revoke session from another device
    Given I am signed in on multiple devices
    And I am on the security settings page
    When I click "Revoke" on a session
    Then that session should be terminated
    And the user on that device should be signed out

  @responsive
  Scenario: Profile management works on mobile
    Given I am using a mobile device
    And I am on the profile page
    When I update my profile information
    Then the mobile-optimized form should work correctly
    And changes should be saved successfully

  @accessibility
  Scenario: Profile forms are screen reader friendly
    Given I am using a screen reader
    And I am on the profile edit page
    Then all form fields should have proper labels
    And error messages should be announced
    And success messages should be announced
