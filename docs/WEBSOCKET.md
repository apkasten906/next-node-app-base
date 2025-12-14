# WebSocket System Documentation

## Overview

The WebSocket system provides real-time bidirectional communication between the Next.js frontend and Node.js backend using Socket.io. It includes authentication, room management, Redis adapter for horizontal scaling, rate limiting, and comprehensive event handling.

## Architecture

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│   Frontend      │◄────────Connection─────────►│    Backend       │
│  (React Hook)   │         (Socket.io)         │   (Express)      │
└─────────────────┘                             └──────────────────┘
         │                                               │
         │                                               │
         ▼                                               ▼
  useWebSocket Hook                            WebSocketService
    - Connection State                          - Authentication
    - Auto-reconnect                            - Room Management
    - Event Subscriptions                       - Redis Adapter
    - Error Handling                            - Rate Limiting
                                                 - Metrics & Health
```

## Features

### Core Features

- **Authentication**: Token-based authentication middleware
- **Room Management**: Join/leave rooms for targeted messaging
- **Real-time Events**: Message, typing indicators, presence updates
- **Redis Adapter**: Horizontal scaling across multiple servers
- **Rate Limiting**: Connection limits and event throttling
- **Automatic Reconnection**: Client-side reconnection logic
- **Health Checks**: Service health and metrics endpoints
- **Graceful Shutdown**: Clean connection closure

### Security

- Token-based authentication required for all connections
- CORS configuration
- Rate limiting to prevent abuse
- Input validation on all events
- Secure WebSocket transport (wss:// in production)

## Quick Start

### Backend Setup

```typescript
// Already integrated in apps/backend/src/index.ts
// WebSocket server initializes automatically on app start
```

### Frontend Usage

```typescript
import { useWebSocket } from '@/hooks/useWebSocket';
import { WebSocketEvent, MessageType } from '@repo/types';

function ChatComponent() {
  const {
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    on,
    off,
  } = useWebSocket({
    token: 'your-auth-token',
    userId: 'user-123',
    autoConnect: true,
    onConnect: () => console.log('Connected'),
    onDisconnect: (reason) => console.log('Disconnected:', reason),
    onError: (error) => console.error('Error:', error),
  });

  useEffect(() => {
    if (isConnected) {
      // Join a room
      joinRoom({ room: 'chat-room' }).then((response) => {
        console.log('Joined room:', response);
      });
    }

    return () => {
      leaveRoom({ room: 'chat-room' });
    };
  }, [isConnected]);

  useEffect(() => {
    // Listen for messages
    const handleMessage = (message: MessagePayload) => {
      console.log('Received:', message);
    };

    on(WebSocketEvent.MESSAGE, handleMessage);

    return () => {
      off(WebSocketEvent.MESSAGE, handleMessage);
    };
  }, [on, off]);

  const handleSendMessage = () => {
    sendMessage({
      from: 'user-123',
      room: 'chat-room',
      content: 'Hello!',
      type: MessageType.TEXT,
    });
  };

  return (
    <div>
      <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
      <button onClick={handleSendMessage}>Send Message</button>
    </div>
  );
}
```

## Configuration

### Environment Variables

#### Backend

```bash
# WebSocket Server Configuration
WEBSOCKET_PORT=3001
WEBSOCKET_PATH=/socket.io
WEBSOCKET_CORS_ORIGIN=http://localhost:3000,https://app.example.com
WEBSOCKET_PING_TIMEOUT=60000
WEBSOCKET_PING_INTERVAL=25000
WEBSOCKET_MAX_BUFFER_SIZE=1048576
WEBSOCKET_MAX_CONNECTIONS=1000
WEBSOCKET_RATE_LIMIT_WINDOW=60000

# Redis Configuration (for scaling)
REDIS_URL=redis://localhost:6379
```

#### Frontend

```bash
# WebSocket Client Configuration
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
NEXT_PUBLIC_WEBSOCKET_PATH=/socket.io
```

## Event Types

### Client-to-Server Events

```typescript
// Join a room
socket.emit(WebSocketEvent.JOIN_ROOM, {
  room: 'room-name',
  metadata: {
    /* optional */
  },
});

// Leave a room
socket.emit(WebSocketEvent.LEAVE_ROOM, {
  room: 'room-name',
});

// Send message
socket.emit(WebSocketEvent.MESSAGE, {
  from: 'user-id',
  room: 'room-name', // optional
  to: 'recipient-socket-id', // optional
  content: 'message content',
  type: MessageType.TEXT,
  metadata: {
    /* optional */
  },
});

// Typing indicators
socket.emit(WebSocketEvent.TYPING_START, { room: 'room-name' });
socket.emit(WebSocketEvent.TYPING_STOP, { room: 'room-name' });

// Presence update
socket.emit(WebSocketEvent.PRESENCE_UPDATE, PresenceStatus.ONLINE);

// Ping (latency check)
socket.emit(WebSocketEvent.PING);
```

### Server-to-Client Events

```typescript
// Room events
socket.on(WebSocketEvent.ROOM_JOINED, (response: JoinRoomResponse) => {});
socket.on(WebSocketEvent.ROOM_LEFT, (response: LeaveRoomResponse) => {});
socket.on(WebSocketEvent.ROOM_ERROR, (error: WebSocketError) => {});

// Messages
socket.on(WebSocketEvent.MESSAGE, (message: MessagePayload) => {});

// Typing indicators
socket.on(WebSocketEvent.TYPING_START, (indicator: TypingIndicator) => {});
socket.on(WebSocketEvent.TYPING_STOP, (indicator: TypingIndicator) => {});

// Presence
socket.on(WebSocketEvent.PRESENCE_UPDATE, (presence: PresenceUpdate) => {});

// System events
socket.on(WebSocketEvent.ERROR, (error: WebSocketError) => {});
socket.on(WebSocketEvent.PONG, () => {});
```

## Room Management

Rooms allow broadcasting messages to specific groups of users.

```typescript
// Join multiple rooms
await joinRoom({ room: 'general' });
await joinRoom({ room: 'team-123' });

// Send to specific room
sendMessage({
  from: 'user-id',
  room: 'team-123',
  content: 'Team message',
  type: MessageType.TEXT,
});

// Leave room when done
await leaveRoom({ room: 'team-123' });
```

## Scaling with Redis

When multiple backend instances are running, the Redis adapter ensures messages are propagated across all instances:

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Backend  │     │ Backend  │     │ Backend  │
│ Instance │     │ Instance │     │ Instance │
│    1     │     │    2     │     │    3     │
└────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
                 ┌────▼────┐
                 │  Redis  │
                 │ Pub/Sub │
                 └─────────┘
```

Messages sent to any instance are broadcasted to all instances via Redis Pub/Sub.

## Health Checks

### WebSocket Health Endpoint

The WebSocket health is included in the `/ready` endpoint:

```bash
curl http://localhost:3001/ready
```

Response:

```json
{
  "database": true,
  "cache": true,
  "websocket": {
    "status": "healthy",
    "connections": 42,
    "rooms": 10,
    "uptime": 3600000,
    "redis": {
      "connected": true,
      "latency": 2
    },
    "timestamp": "2024-12-14T..."
  },
  "status": "ready"
}
```

## Monitoring

### Metrics

Access WebSocket metrics programmatically:

```typescript
const metrics = websocketService.getMetrics();
console.log(metrics);
// {
//   totalConnections: 100,
//   activeConnections: 95,
//   totalRooms: 20,
//   messagesPerSecond: 15.2,
//   averageLatency: 25,
//   errorRate: 0.001,
//   timestamp: Date
// }
```

### Connection Info

Get information about specific connections:

```typescript
const info = websocketService.getConnectionInfo(socketId);
console.log(info);
// {
//   socketId: 'abc123',
//   userId: 'user-456',
//   connectedAt: Date,
//   rooms: ['general', 'team-5'],
//   metadata: { device: 'mobile' }
// }
```

### Room Info

Get information about rooms:

```typescript
const roomInfo = websocketService.getRoomInfo('general');
console.log(roomInfo);
// {
//   name: 'general',
//   memberCount: 42,
//   members: ['socket-1', 'socket-2', ...],
//   createdAt: Date
// }
```

## Error Handling

### Error Codes

```typescript
enum WebSocketErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_ROOM = 'INVALID_ROOM',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}
```

### Handling Errors

```typescript
const { on } = useWebSocket({
  onError: (error: WebSocketError) => {
    console.error(`Error ${error.code}: ${error.message}`);

    switch (error.code) {
      case WebSocketErrorCode.AUTHENTICATION_FAILED:
        // Handle auth error
        break;
      case WebSocketErrorCode.RATE_LIMIT_EXCEEDED:
        // Handle rate limit
        break;
      // ...
    }
  },
});

// Also listen for error events
useEffect(() => {
  const handleError = (error: WebSocketError) => {
    // Handle error
  };

  on(WebSocketEvent.ERROR, handleError);
  return () => off(WebSocketEvent.ERROR, handleError);
}, [on, off]);
```

## Best Practices

### 1. Authentication

- Always provide a valid token when connecting
- Refresh tokens before they expire
- Handle authentication errors gracefully

### 2. Connection Management

- Use `autoConnect: true` for automatic connection
- Implement reconnection logic
- Clean up connections on component unmount

### 3. Event Subscriptions

- Always clean up event listeners in useEffect
- Use specific event names (avoid wildcards)
- Implement error handlers for all events

### 4. Room Management

- Leave rooms when no longer needed
- Don't join too many rooms per connection
- Use descriptive room names

### 5. Message Handling

- Validate message content before sending
- Keep messages small (<1MB)
- Use appropriate message types
- Implement delivery acknowledgments for critical messages

### 6. Performance

- Throttle typing indicators
- Batch messages when possible
- Use rooms instead of broadcasting to all
- Monitor connection count and metrics

### 7. Error Handling

- Implement global error handler
- Log errors for debugging
- Show user-friendly error messages
- Implement retry logic for transient errors

## Troubleshooting

### Common Issues

#### 1. Connection Fails

```typescript
// Check token is valid
console.log('Token:', token);

// Check URL is correct
console.log('URL:', process.env.NEXT_PUBLIC_WEBSOCKET_URL);

// Check CORS configuration
// Backend: WEBSOCKET_CORS_ORIGIN must include frontend origin
```

#### 2. Messages Not Received

```typescript
// Ensure both clients are in same room
await joinRoom({ room: 'same-room' });

// Check event listeners are registered
useEffect(() => {
  on(WebSocketEvent.MESSAGE, handleMessage);
  return () => off(WebSocketEvent.MESSAGE, handleMessage);
}, [on, off]);
```

#### 3. Disconnections

```typescript
// Implement reconnection handler
const { isReconnecting } = useWebSocket({
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  onReconnect: (attempt) => {
    console.log(`Reconnected after ${attempt} attempts`);
  },
});

// Show UI feedback
{isReconnecting && <div>Reconnecting...</div>}
```

#### 4. Rate Limiting

```typescript
// Check connection limits
// WEBSOCKET_MAX_CONNECTIONS (default: 1000)

// Implement exponential backoff
let backoff = 1000;
const connect = () => {
  socket.connect();
  socket.on('connect_error', () => {
    setTimeout(() => connect(), backoff);
    backoff *= 2; // Exponential backoff
  });
};
```

## Production Deployment

### 1. Use WSS (Secure WebSocket)

```bash
NEXT_PUBLIC_WEBSOCKET_URL=wss://api.example.com
```

### 2. Configure Load Balancer

```nginx
# Nginx configuration for WebSocket
location /socket.io/ {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### 3. Enable Redis Adapter

```bash
REDIS_URL=redis://redis-cluster:6379
```

### 4. Set Appropriate Limits

```bash
WEBSOCKET_MAX_CONNECTIONS=5000
WEBSOCKET_MAX_BUFFER_SIZE=1048576  # 1MB
```

### 5. Monitor Performance

- Track connection count
- Monitor message throughput
- Watch error rates
- Set up alerts for degraded states

## API Reference

See type definitions in `packages/types/src/websocket.types.ts` for complete API documentation.

## Testing

Run WebSocket tests:

```bash
pnpm --filter backend test:unit -t "WebSocketService"
```

## Security Considerations

1. **Authentication**: All connections must be authenticated with valid tokens
2. **Rate Limiting**: Configured to prevent abuse (max connections, message throttling)
3. **CORS**: Restrict origins to known frontend URLs
4. **Transport Security**: Use WSS in production
5. **Input Validation**: All event payloads are validated
6. **Connection Limits**: Prevent resource exhaustion
7. **Message Size Limits**: Prevent large message attacks

## Additional Resources

- [Socket.io Documentation](https://socket.io/docs/)
- [Socket.io Redis Adapter](https://socket.io/docs/v4/redis-adapter/)
- [WebSocket Security Best Practices](https://owasp.org/www-community/vulnerabilities/WebSocket_security)
