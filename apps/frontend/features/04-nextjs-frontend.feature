Feature: Next.js Frontend Application
  As a user
  We need a modern Next.js frontend application
  So that we can interact with the backend services

  Background:
    Given the Next.js application is running on port 3000
    And the backend API is running on port 3001

  @frontend @nextjs @app-router
  Scenario: Next.js App Router architecture
    Given Next.js 16 App Router is configured
    When I navigate to a route
    Then the correct page component should render
    And React Server Components should be used
    And client components should be marked with "use client"

  @frontend @nextauth @setup
  Scenario: NextAuth authentication setup
    Given NextAuth is configured with OAuth providers
    When I view the application
    Then authentication should be available
    And session management should work
    And CSRF protection should be enabled

  @frontend @nextauth @login
  Scenario: User login with NextAuth
    Given I am on the login page
    When I click "Sign in with Google"
    Then I should be redirected to Google OAuth
    When I authenticate successfully
    Then I should be redirected back to the app
    And I should be logged in
    And session should be created

  @frontend @nextauth @session
  Scenario: Session persistence
    Given I am logged in
    When I refresh the page
    Then my session should persist
    And I should remain logged in
    When session expires
    Then I should be logged out
    And I should be redirected to login

  @frontend @nextauth @logout
  Scenario: User logout
    Given I am logged in
    When I click logout button
    Then my session should be destroyed
    And I should be logged out
    And I should be redirected to home page

  @frontend @dashboard
  Scenario: Protected dashboard access
    Given I am not logged in
    When I try to access "/dashboard"
    Then I should be redirected to login page
    Given I am logged in
    When I access "/dashboard"
    Then I should see the dashboard
    And user information should be displayed

  @frontend @tanstack-query @setup
  Scenario: TanStack Query configuration
    Given TanStack Query is set up
    When the application loads
    Then QueryClient should be configured
    And query devtools should be available in development

  @frontend @tanstack-query @fetching
  Scenario: Data fetching with TanStack Query
    Given I am on a page that fetches user data
    When the page loads
    Then a loading state should be shown
    When data is fetched successfully
    Then data should be displayed
    And data should be cached

  @frontend @tanstack-query @mutations
  Scenario: Data mutations with TanStack Query
    Given I am on a form page
    When I submit the form
    Then mutation should be triggered
    And loading state should be shown
    When mutation succeeds
    Then success feedback should be shown
    And cache should be invalidated
    And data should be refetched

  @frontend @tanstack-query @error
  Scenario: Query error handling
    Given API returns an error
    When query executes
    Then error state should be shown
    And error message should be displayed
    And retry button should be available

  @frontend @tailwind
  Scenario: Tailwind CSS styling
    Given Tailwind CSS 4 is configured
    When I inspect components
    Then Tailwind utility classes should be used
    And responsive design should work
    And dark mode should be supported

  @frontend @responsive
  Scenario: Responsive layout
    When I view the site on mobile "<device>"
    Then layout should adapt to screen size
    And navigation should collapse to menu
    And content should be readable

    Examples:
      | device       |
      | iPhone 12    |
      | iPad Pro     |
      | Desktop 1920 |

  @frontend @dark-mode
  Scenario: Dark mode toggle
    Given the application supports dark mode
    When I toggle dark mode
    Then theme should switch to dark
    And preference should be saved
    When I reload the page
    Then dark mode preference should persist

  @frontend @seo @metadata
  Scenario: SEO metadata configuration
    Given SEO metadata is configured
    When I view page source
    Then title tag should be present
    And meta description should be present
    And Open Graph tags should be present

  @frontend @seo @sitemap
  Scenario: Sitemap generation
    When I access "/sitemap.xml"
    Then a valid XML sitemap should be returned
    And all public pages should be listed
    And lastmod dates should be included

  @frontend @image-optimization
  Scenario: Next.js Image optimization
    Given images use next/image component
    When images load
    Then images should be optimized
    And lazy loading should be enabled
    And responsive sizes should be served

  @frontend @font-optimization
  Scenario: Font optimization with next/font
    Given custom fonts are configured with next/font
    When page loads
    Then fonts should be self-hosted
    And font loading should not block render
    And FOUT/FOIT should be prevented

  @frontend @route-protection
  Scenario: Route-level authentication
    Given certain routes require authentication
    When unauthenticated user accesses protected route
    Then user should be redirected to login
    When authenticated user accesses protected route
    Then route should be accessible

  @frontend @role-authorization
  Scenario: Role-based page access
    Given I am logged in as role "<role>"
    When I try to access "<page>"
    Then access should be "<result>"

    Examples:
      | role      | page           | result  |
      | admin     | /admin         | allowed |
      | user      | /admin         | denied  |
      | moderator | /moderation    | allowed |
      | user      | /moderation    | denied  |

  @frontend @client-validation
  Scenario: Client-side form validation
    Given I am on a registration form
    When I submit with invalid email
    Then validation error should show
    And form should not submit
    When I correct the error
    Then validation should pass

  @frontend @error-pages
  Scenario: Custom error pages
    When I navigate to non-existent route
    Then custom 404 page should be shown
    And helpful navigation should be provided
    When server error occurs
    Then custom 500 page should be shown

  @frontend @loading-states
  Scenario: Loading UI with Suspense
    Given a page uses React Suspense
    When the page loads
    Then loading fallback should be shown
    When data is ready
    Then actual content should be shown

  @frontend @streaming
  Scenario: Streaming SSR for faster page loads
    Given page uses streaming SSR
    When I navigate to the page
    Then shell should render immediately
    And content should stream progressively
    And time to first byte should be minimal

  @frontend @api-routes
  Scenario: Next.js API routes (if using Route Handlers)
    When I call GET "/api/example"
    Then the API route should respond
    And response should be JSON
    And status code should be 200

  @frontend @middleware
  Scenario: Next.js middleware for request handling
    Given middleware is configured
    When I make a request
    Then middleware should execute
    And headers should be modified
    And request should be processed

  @frontend @internationalization
  Scenario: Internationalization with next-i18next
    Given i18n is configured for languages ["en", "es", "fr"]
    When I switch language to "es"
    Then UI text should change to Spanish
    And language preference should be saved
    When I reload
    Then Spanish should still be selected
