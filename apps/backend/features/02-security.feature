@wip
Feature: Security Framework
  As a security-conscious development team
  We need comprehensive security measures
  So that user data and system integrity are protected

  Background:
    Given the security framework is initialized
    And environment variables are configured

  @security @dependency-injection
  Scenario: TSyringe dependency injection setup
    Given TSyringe is configured as the DI container
    When I resolve a service from the container
    Then the service should be properly instantiated
    And dependencies should be injected correctly
    And singleton services should maintain state

  @security @jwt
  Scenario: JWT token generation and validation
    Given a user with valid credentials
    When I generate a JWT token for the user
    Then the token should contain user claims
    And the token should be signed with the secret key
    And the token should have an expiration time
    When I validate the JWT token
    Then the validation should succeed
    And user information should be extracted correctly

  @security @jwt-expiration
  Scenario: JWT token expiration handling
    Given an expired JWT token
    When I attempt to validate the expired token
    Then the validation should fail
    And an expiration error should be returned

  @security @password-hashing
  Scenario: Password hashing with bcrypt
    Given a plain text password "<password>"
    When I hash the password using bcrypt
    Then the hash should be different from the plain text
    And the hash should include a salt
    When I compare the plain text password with the hash
    Then the comparison should succeed

    Examples:
      | password        |
      | SecurePass123!  |
      | MyP@ssw0rd2024  |
      | C0mpl3x!tyTest  |

  @security @password-strength
  Scenario: Password strength validation
    Given a password policy requiring minimum 8 characters
    When I validate password "<password>"
    Then the validation should return "<result>"

    Examples:
      | password        | result   |
      | weak            | rejected |
      | StrongP@ss1     | accepted |
      | 12345678        | rejected |
      | Test!234        | accepted |

  @security @encryption
  Scenario: Data encryption with AES-256-GCM
    Given an encryption service with AES-256-GCM
    When I encrypt sensitive data "<data>"
    Then the encrypted data should be different from the original
    And the encryption should include an IV
    And the encryption should include an auth tag
    When I decrypt the encrypted data
    Then I should get the original data back

    Examples:
      | data                           |
      | sensitive user information     |
      | credit card number             |
      | social security number         |

  @security @rbac
  Scenario: Role-Based Access Control (RBAC)
    Given a user with role "<role>"
    When the user attempts to access resource "<resource>"
    Then access should be "<result>"

    Examples:
      | role      | resource        | result  |
      | admin     | user-management | granted |
      | user      | user-management | denied  |
      | moderator | content-review  | granted |
      | user      | content-review  | denied  |
      | admin     | system-settings | granted |

  @security @abac
  Scenario: Attribute-Based Access Control (ABAC)
    Given a user with attributes:
      | attribute  | value           |
      | department | engineering     |
      | level      | senior          |
      | clearance  | confidential    |
    When the user attempts to access a resource requiring:
      | attribute  | value           |
      | department | engineering     |
      | clearance  | confidential    |
    Then access should be granted
    And ABAC policy should be evaluated correctly

  @security @rate-limiting
  Scenario: Rate limiting for API endpoints
    Given rate limiting is enabled for endpoint "/api/auth/login"
    And the limit is 5 requests per minute
    When I make 5 requests to "/api/auth/login"
    Then all requests should succeed
    When I make the 6th request
    Then the request should be rejected
    And I should receive a 429 status code

  @security @owasp
  Scenario: OWASP Top 10 protection with Helmet.js
    Given Helmet.js is configured for Express
    When I make a request to any API endpoint
    Then security headers should be present:
      | header                      |
      | X-Content-Type-Options      |
      | X-Frame-Options             |
      | X-XSS-Protection            |
      | Strict-Transport-Security   |
      | Content-Security-Policy     |

  @security @cors
  Scenario: CORS configuration for allowed origins
    Given CORS is configured with allowed origins
    When I make a request from origin "<origin>"
    Then the request should be "<result>"

    Examples:
      | origin                    | result   |
      | http://localhost:3000     | allowed  |
      | https://trusted-domain.com| allowed  |
      | https://malicious.com     | blocked  |

  @security @audit-log
  Scenario: Security audit logging
    Given audit logging is enabled
    When a user "<action>" on resource "<resource>"
    Then an audit log entry should be created
    And the log should contain:
      | field       |
      | userId      |
      | action      |
      | resource    |
      | timestamp   |
      | ipAddress   |
      | userAgent   |

    Examples:
      | action  | resource      |
      | create  | user-account  |
      | update  | user-profile  |
      | delete  | sensitive-data|
      | access  | admin-panel   |

  @security @input-validation
  Scenario: Input validation and sanitization
    Given input validation is configured
    When I submit data with malicious input "<input>"
    Then the input should be sanitized
    And SQL injection attempts should be blocked
    And XSS attempts should be blocked

    Examples:
      | input                                    |
      | <script>alert('xss')</script>           |
      | '; DROP TABLE users; --                 |
      | ../../../etc/passwd                     |

  @security @secrets-management
  Scenario: Environment-based secrets management
    Given secrets are stored in environment variables
    When the application starts
    Then secrets should be loaded from .env file
    And secrets should never be committed to Git
    And secrets should be different per environment

  @security @session-management
  Scenario: Secure session management
    Given a user logs in successfully
    When a session is created
    Then the session should have a secure cookie
    And the cookie should be HTTP-only
    And the cookie should have SameSite attribute
    When the user logs out
    Then the session should be invalidated
    And the session cookie should be cleared
