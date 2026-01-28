@wip
Feature: API Design Patterns
  As an API consumer
  We need well-designed RESTful APIs with versioning and documentation
  So that we can build reliable integrations

  Background:
    Given the API server is running
    And API endpoints are registered

  @api @versioning @header
  Scenario: Header-based API versioning
    Given API versioning is configured
    When I make a request with Accept header "application/vnd.api+json; version=1.0"
    Then the request should be routed to v1.0 API
    And the response should indicate version 1.0

  @api @versioning @fallback
  Scenario: Default API version fallback
    Given API versioning is configured with default version 1.0
    When I make a request without version header
    Then the request should be routed to v1.0 API (default)

  @api @versioning @unsupported
  Scenario: Unsupported API version handling
    When I make a request with Accept header "application/vnd.api+json; version=99.0"
    Then the response status should be 400
    And the response should indicate unsupported version

  @api @hateoas
  Scenario: HATEOAS links in API responses
    Given HATEOAS is enabled for API endpoints
    When I GET "/api/users/123"
    Then the response should include "_links" object
    And "_links" should contain "self" link
    And "_links" should contain "update" link
    And "_links" should contain "delete" link

  @api @hateoas @pagination
  Scenario: HATEOAS pagination links
    Given a collection endpoint with multiple pages
    When I GET "/api/users?page=2&pageSize=10"
    Then the response should include pagination links:
      | link  |
      | self  |
      | first |
      | prev  |
      | next  |
      | last  |

  @api @pagination
  Scenario: Pagination with query parameters
    Given a collection of 50 users exists
    When I GET "/api/users?page=<page>&pageSize=<pageSize>"
    Then the response should contain <count> items
    And pagination metadata should be included

    Examples:
      | page | pageSize | count |
      | 1    | 10       | 10    |
      | 2    | 10       | 10    |
      | 5    | 10       | 10    |
      | 6    | 10       | 0     |

  @api @filtering
  Scenario: Resource filtering with query operators
    Given users exist in the database
    When I GET "/api/users?filter=<filter>"
    Then the response should contain only matching users

    Examples:
      | filter                          |
      | email[contains]=@example.com    |
      | createdAt[gte]=2024-01-01       |
      | role[eq]=admin                  |
      | age[gt]=18                      |

  @api @filtering @multiple
  Scenario: Multiple filter conditions
    Given users exist with various attributes
    When I GET "/api/users?filter=role[eq]=admin&filter=status[eq]=active"
    Then only users matching all conditions should be returned

  @api @sorting
  Scenario: Resource sorting
    Given users exist in the database
    When I GET "/api/users?sort=<sortField>&order=<order>"
    Then users should be sorted by <sortField> in <order> order

    Examples:
      | sortField | order |
      | createdAt | desc  |
      | email     | asc   |
      | name      | asc   |

  @api @sorting @multiple
  Scenario: Multi-field sorting
    Given users exist in the database
    When I GET "/api/users?sort=role,createdAt&order=asc,desc"
    Then users should be sorted first by role ascending
    And then by createdAt descending

  @api @swagger
  Scenario: Swagger/OpenAPI documentation
    Given Swagger is configured
    When I navigate to "/api-docs"
    Then I should see Swagger UI
    And API endpoints should be documented
    And request/response schemas should be defined
    And I should be able to test APIs from the UI

  @api @swagger @schemas
  Scenario: OpenAPI schema definitions
    Given OpenAPI specifications are defined
    When I view the Swagger documentation
    Then common schemas should be defined:
      | schema          |
      | Error           |
      | HATEOASLink     |
      | PaginationMeta  |
      | User            |
      | FileMetadata    |

  @api @swagger @security
  Scenario: Swagger security schemes
    Given security schemes are defined in Swagger
    When I view API endpoints in Swagger
    Then JWT Bearer authentication should be documented
    And protected endpoints should show lock icon
    And I should be able to authenticate via Swagger UI

  @api @rate-limiting @endpoint
  Scenario: Per-endpoint rate limiting
    Given rate limiting is configured for "/api/users"
    And the limit is 100 requests per minute
    When I make 100 requests to "/api/users"
    Then all requests should succeed
    When I make the 101st request
    Then the request should be rejected with 429 status

  @api @compression
  Scenario: Response compression for large payloads
    Given compression middleware is enabled
    When I request a large collection endpoint
    Then the response should be compressed
    And Content-Encoding should be "gzip"
    And response size should be significantly reduced

  @api @etag
  Scenario: ETag caching for conditional requests
    Given ETags are enabled for resource endpoints
    When I GET "/api/users/123"
    Then the response should include an ETag header
    When I make the same request with If-None-Match header
    Then the response status should be 304 Not Modified
    And no body should be returned

  @api @content-negotiation
  Scenario: Content type negotiation
    When I request "/api/users" with Accept header "application/json"
    Then the response Content-Type should be "application/json"
    When I request "/api/users" with Accept header "application/xml"
    Then the response status should be 406 Not Acceptable

  @api @error-response
  Scenario: Standardized error responses
    Given API error handling is configured
    When an error occurs during request processing
    Then the error response should have consistent structure:
      | field   |
      | error   |
      | message |
      | status  |
      | path    |

  @api @query-validation
  Scenario: Query parameter validation
    Given query parameter validation is enabled
    When I GET "/api/users?page=<page>&pageSize=<pageSize>"
    Then the response should be "<result>"

    Examples:
      | page | pageSize | result    |
      | 1    | 10       | valid     |
      | -1   | 10       | invalid   |
      | 1    | 1000     | invalid   |
      | abc  | 10       | invalid   |
