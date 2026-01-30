Feature: Internationalization (i18n)
  As a user
  I want the UI to support multiple languages
  So that I can use the app in my preferred locale

  @ready @frontend @i18n
  Scenario: Supported locales are configured
    Given the i18n configuration is loaded
    Then default locale should be "en"
    And supported locales should include:
      | en |
      | es |
      | fr |
      | de |
