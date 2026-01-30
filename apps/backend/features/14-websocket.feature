@wip
Feature: WebSocket Real-Time Communication
  As a developer
  We need real-time bidirectional communication
  So that users can receive instant updates and collaborate in real-time

  Background:
    Given WebSocket server is initialized on port 3001
    And Redis adapter is configured for scaling
    And authentication middleware is active

  @websocket @ready
  Scenario: WebSocket service wiring is configured
    Given the backend WebSocket service is implemented
    Then WebSockets should be gated by "DISABLE_WEBSOCKETS"
    And WebSocket service should use Socket.io with Redis adapter support
    And WebSocket service should default to path "/socket.io"

  @websocket @connection
  Scenario: Client connects with valid token
    Given I have a valid authentication token
    When I connect to WebSocket server with token
    Then the connection should be established
    And I should receive a connection confirmation
    And my connection should be tracked in server

  @websocket @connection
  Scenario: Client connection rejected without token
    Given I do not have an authentication token
    When I attempt to connect to WebSocket server
    Then the connection should be rejected
    And I should receive an authentication error
    And connection count should not increase

  @websocket @connection
  Scenario: Client disconnects gracefully
    Given I am connected to WebSocket server
    When I disconnect from the server
    Then my connection should be removed from tracking
    And any rooms I joined should be cleaned up
    And disconnect event should be logged

  @websocket @rooms
  Scenario: Client joins a room
    Given I am connected to WebSocket server
    When I request to join room "project-123"
    Then I should successfully join the room
    And I should receive a join confirmation
    And the room should be added to my connection info
    And room member count should increase

  @websocket @rooms
  Scenario: Client leaves a room
    Given I am connected to WebSocket server
    And I have joined room "project-123"
    When I request to leave the room
    Then I should successfully leave the room
    And I should receive a leave confirmation
    And the room should be removed from my connection info
    And room member count should decrease

  @websocket @rooms
  Scenario: Get room information
    Given multiple clients are connected to WebSocket server
    And 5 clients have joined room "team-chat"
    When I request room information for "team-chat"
    Then I should receive room details
    And member count should be 5
    And room name should be "team-chat"

  @websocket @messaging
  Scenario: Send message to room
    Given I am connected to WebSocket server
    And I have joined room "project-123"
    And other clients are in the same room
    When I send a message "Hello team" to the room
    Then all clients in the room should receive the message
    And the message should include my user ID
    And the message should have a timestamp

  @websocket @messaging
  Scenario: Send direct message to user
    Given I am connected to WebSocket server
    And user "user-456" is also connected
    When I send a direct message "Hi there" to user "user-456"
    Then only user "user-456" should receive the message
    And the message should include sender information
    And other clients should not receive the message

  @websocket @typing
  Scenario: Broadcast typing indicator
    Given I am connected to WebSocket server
    And I have joined room "chat-room"
    When I start typing in the room
    Then other room members should receive typing-start event
    And the event should include my user ID
    And the event should include the room ID

  @websocket @typing
  Scenario: Stop typing indicator
    Given I am connected to WebSocket server
    And I have joined room "chat-room"
    And I am currently typing
    When I stop typing
    Then other room members should receive typing-stop event
    And my typing indicator should be cleared

  @websocket @presence
  Scenario: Update user presence status
    Given I am connected to WebSocket server
    When I update my presence to "away"
    Then other connected clients should receive presence update
    And my status should change to "away"
    And the update should include timestamp

  @websocket @presence
  Scenario: Presence statuses
    Given I am connected to WebSocket server
    Then I can set presence to "online"
    And I can set presence to "away"
    And I can set presence to "busy"
    And I can set presence to "offline"

  @websocket @broadcasting
  Scenario: Broadcast to all connected clients
    Given multiple clients are connected to WebSocket server
    When server broadcasts a system announcement
    Then all connected clients should receive the message
    And the message should be marked as broadcast
    And the message should include system sender

  @websocket @broadcasting
  Scenario: Broadcast to specific room only
    Given I am connected to WebSocket server
    And room "team-a" has 5 clients
    And room "team-b" has 3 clients
    When server broadcasts to room "team-a"
    Then only clients in "team-a" should receive the message
    And clients in "team-b" should not receive the message

  @websocket @scaling
  Scenario: Horizontal scaling with Redis adapter
    Given Redis Pub/Sub is configured
    And multiple WebSocket server instances are running
    When I connect to instance-1 and join room "global"
    And another user connects to instance-2 and joins same room
    And I send a message to the room
    Then the user on instance-2 should receive the message
    And Redis should handle message distribution

  @websocket @rate-limiting
  Scenario: Connection rate limiting
    Given max connections limit is 1000
    When 1001 clients attempt to connect
    Then first 1000 connections should succeed
    And 1001st connection should be rejected
    And rate limit error should be returned

  @websocket @rate-limiting
  Scenario: Event rate limiting per client
    Given I am connected to WebSocket server
    And event throttling is enabled
    When I send 100 events rapidly
    Then events should be throttled appropriately
    And excessive events should be rejected
    And rate limit warning should be issued

  @websocket @health
  Scenario: WebSocket health check
    Given WebSocket server is running
    When health check is requested
    Then health status should be "healthy"
    And connection count should be included
    And uptime should be reported
    And Redis adapter status should be included

  @websocket @health
  Scenario: WebSocket metrics
    Given WebSocket server is running
    And multiple clients are connected
    When metrics are requested
    Then active connections count should be reported
    And total messages sent should be tracked
    And error count should be available
    And uptime should be included

  @websocket @error-handling
  Scenario: Handle invalid event data
    Given I am connected to WebSocket server
    When I send malformed event data
    Then I should receive an error event
    And the error should describe validation failure
    And my connection should remain active

  @websocket @error-handling
  Scenario: Handle room join timeout
    Given I am connected to WebSocket server
    When I request to join a room
    And the request takes longer than 5 seconds
    Then I should receive a timeout error
    And the join request should be cancelled

  @websocket @security
  Scenario: Token expiration during connection
    Given I am connected with a token expiring in 1 minute
    When my token expires
    Then I should receive token expiration notice
    And I should be disconnected gracefully
    And I should be able to reconnect with new token

  @websocket @security
  Scenario: Prevent unauthorized room access
    Given I am connected to WebSocket server
    And room "private-channel" requires special permissions
    When I attempt to join the room without permission
    Then the join request should be denied
    And I should receive permission error

  @websocket @integration
  Scenario: WebSocket integrates with HTTP server
    Given backend HTTP server is running
    And WebSocket service is initialized
    When I check server health endpoint
    Then WebSocket health should be included
    And both HTTP and WebSocket should be operational

  @websocket @shutdown
  Scenario: Graceful shutdown
    Given WebSocket server is running
    And multiple clients are connected
    When server shutdown is initiated
    Then all clients should be notified
    And connections should close gracefully
    And Redis connections should close properly
    And no data should be lost

  @websocket @frontend
  Scenario: React hook manages connection state
    Given I use useWebSocket hook in frontend
    When component mounts
    Then WebSocket connection should be established
    And connection state should be "connected"
    When component unmounts
    Then WebSocket should disconnect cleanly

  @websocket @frontend
  Scenario: Auto-reconnection after disconnect
    Given I am connected via useWebSocket hook
    When connection is lost unexpectedly
    Then auto-reconnection should be attempted
    And reconnection attempts should use exponential backoff
    And connection state should show "reconnecting"
    When reconnection succeeds
    Then connection state should return to "connected"
