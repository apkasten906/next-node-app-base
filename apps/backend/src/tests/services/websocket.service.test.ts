import { Server as HttpServer } from 'node:http';

import {
  JoinRoomRequest,
  LeaveRoomRequest,
  MessagePayload,
  MessageType,
  PresenceStatus,
  WebSocketEvent,
} from '@repo/types';
import { Socket as ClientSocket, io as ioClient } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoggerService } from '../../services/logger.service';
import { WebSocketService } from '../../services/websocket/websocket.service';

const DEFAULT_TIMEOUT_MS = 2000;

type RoomJoinedResponse = { success: boolean; room: string; memberCount: number };
type RoomLeftResponse = { success: boolean; room: string };
type ReceivedMessage = { id: string; content: string; room?: string; timestamp: unknown };
type TypingIndicator = { userId: string; isTyping: boolean };
type PresenceUpdate = { userId: string; status: PresenceStatus };

const delay = async (ms: number): Promise<void> =>
  await new Promise<void>((resolve) => setTimeout(resolve, ms));

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> => {
  let timeoutId: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
};

const listenServer = async (server: HttpServer, port: number): Promise<void> => {
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const onError = (error: Error) => {
        server.off('error', onError);
        reject(error);
      };

      server.once('error', onError);
      server.listen(port, () => {
        server.off('error', onError);
        resolve();
      });
    }),
    DEFAULT_TIMEOUT_MS,
    `Timed out waiting for server to listen on port ${port}`
  );
};

const closeServer = async (server: HttpServer): Promise<void> => {
  await withTimeout(
    new Promise<void>((resolve) => {
      server.close(() => resolve());
    }),
    DEFAULT_TIMEOUT_MS,
    'Timed out waiting for server to close'
  );
};

const waitForConnect = async (socket: ClientSocket): Promise<void> => {
  await withTimeout(
    new Promise<void>((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        resolve();
      };

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
    }),
    DEFAULT_TIMEOUT_MS,
    'Timed out waiting for connect'
  );
};

const waitForConnectError = async (socket: ClientSocket): Promise<Error> => {
  return await withTimeout(
    new Promise<Error>((resolve, reject) => {
      const onConnect = () => {
        cleanup();
        reject(new Error('Expected connection to be rejected'));
      };

      const onError = (error: Error) => {
        cleanup();
        resolve(error);
      };

      const cleanup = () => {
        socket.off('connect', onConnect);
        socket.off('connect_error', onError);
      };

      socket.once('connect', onConnect);
      socket.once('connect_error', onError);
    }),
    DEFAULT_TIMEOUT_MS,
    'Timed out waiting for connect_error'
  );
};

const waitForEvent = async <T>(
  socket: ClientSocket,
  event: string,
  trigger?: () => void,
  timeoutMessage?: string
): Promise<T> => {
  const eventPromise = new Promise<T>((resolve) => {
    socket.once(event, (payload: T) => resolve(payload));
  });

  if (trigger) {
    trigger();
  }

  return await withTimeout(
    eventPromise,
    DEFAULT_TIMEOUT_MS,
    timeoutMessage ?? `Timed out waiting for ${event}`
  );
};

describe('WebSocketService', () => {
  let websocketService: WebSocketService;
  let loggerService: LoggerService;
  let httpServer: HttpServer;
  let clientSocket: ClientSocket;
  const testPort = 3002; // Use different port for tests

  beforeEach(async () => {
    // Setup logger
    loggerService = new LoggerService();
    vi.spyOn(loggerService, 'info');
    vi.spyOn(loggerService, 'error');
    vi.spyOn(loggerService, 'warn');
    vi.spyOn(loggerService, 'debug');

    // Setup HTTP server
    const express = (await import('express')).default;
    const app = express();
    httpServer = (await import('node:http')).createServer(app);

    // Set test environment variables
    process.env['WEBSOCKET_PORT'] = testPort.toString();
    process.env['WEBSOCKET_CORS_ORIGIN'] = 'http://localhost:3000';

    // Create WebSocket service
    websocketService = new WebSocketService(loggerService);
  });

  afterEach(async () => {
    // Cleanup in reverse order
    if (clientSocket?.connected) {
      clientSocket.disconnect();
    }

    if (websocketService) {
      await websocketService.shutdown();
    }

    if (httpServer) {
      await closeServer(httpServer);
    }

    // Close logger to prevent "write after end" errors
    if (loggerService) {
      loggerService.close();
    }

    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize WebSocket server successfully', async () => {
      await websocketService.initialize(httpServer);

      expect(loggerService.info).toHaveBeenCalledWith('Initializing WebSocket service...');
      expect(loggerService.info).toHaveBeenCalledWith(
        'WebSocket service initialized successfully',
        expect.objectContaining({
          path: '/socket.io',
          port: testPort,
        })
      );
    });

    it('should handle initialization errors gracefully', async () => {
      // Pass invalid server
      const invalidServer = null as unknown as HttpServer;

      await expect(websocketService.initialize(invalidServer)).rejects.toThrow();
      expect(loggerService.error).toHaveBeenCalledWith(
        'Failed to initialize WebSocket service',
        expect.any(Error)
      );
    });
  });

  describe('Connection Handling', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await listenServer(httpServer, testPort);
    });

    it('should accept client connections with valid token', async () => {
      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await waitForConnect(clientSocket);
      expect(clientSocket.connected).toBe(true);
    });

    it('should reject connections without token', async () => {
      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {}, // No token
        transports: ['websocket'],
      });

      const error = await waitForConnectError(clientSocket);
      expect(error.message).toContain('AUTHENTICATION_FAILED');
    });

    it('should track connection info', async () => {
      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await waitForConnect(clientSocket);

      if (!clientSocket.id) {
        throw new Error('Expected clientSocket.id to be defined after connect');
      }
      const socketId = clientSocket.id;

      const connectionInfo = websocketService.getConnectionInfo(socketId);
      expect(connectionInfo).toBeDefined();
      expect(connectionInfo?.userId).toBe('user-123');
      expect(connectionInfo?.socketId).toBe(socketId);
      expect(connectionInfo?.rooms).toEqual([]);
    });

    it('should handle disconnection', async () => {
      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await waitForConnect(clientSocket);

      if (!clientSocket.id) {
        throw new Error('Expected clientSocket.id to be defined after connect');
      }
      const socketId = clientSocket.id;
      clientSocket.disconnect();

      await delay(100);

      const connectionInfo = websocketService.getConnectionInfo(socketId);
      expect(connectionInfo).toBeNull();
    });
  });

  describe('Room Management', () => {
    let clientSocketId: string;

    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await listenServer(httpServer, testPort);

      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await waitForConnect(clientSocket);

      if (!clientSocket.id) {
        throw new Error('Expected clientSocket.id to be defined after connect');
      }
      clientSocketId = clientSocket.id;
    });

    it('should allow joining a room', async () => {
      const joinRequest: JoinRoomRequest = {
        room: 'test-room',
      };

      const response = await waitForEvent<RoomJoinedResponse>(
        clientSocket,
        'room-joined',
        () => clientSocket.emit(WebSocketEvent.JOIN_ROOM, joinRequest),
        'Timed out waiting for room-joined'
      );

      expect(response.success).toBe(true);
      expect(response.room).toBe('test-room');
      expect(response.memberCount).toBeGreaterThan(0);
    });

    it('should track rooms in connection info', async () => {
      const joinRequest: JoinRoomRequest = {
        room: 'test-room',
      };

      await waitForEvent<void>(clientSocket, 'room-joined', () =>
        clientSocket.emit(WebSocketEvent.JOIN_ROOM, joinRequest)
      );

      const connectionInfo = websocketService.getConnectionInfo(clientSocketId);
      expect(connectionInfo?.rooms).toContain('test-room');
    });

    it('should allow leaving a room', async () => {
      // First join a room
      const joinRequest: JoinRoomRequest = {
        room: 'test-room',
      };

      await waitForEvent<void>(clientSocket, 'room-joined', () =>
        clientSocket.emit(WebSocketEvent.JOIN_ROOM, joinRequest)
      );

      // Then leave it
      const leaveRequest: LeaveRoomRequest = {
        room: 'test-room',
      };

      const response = await waitForEvent<RoomLeftResponse>(clientSocket, 'room-left', () =>
        clientSocket.emit(WebSocketEvent.LEAVE_ROOM, leaveRequest)
      );

      expect(response.success).toBe(true);
      expect(response.room).toBe('test-room');

      const connectionInfo = websocketService.getConnectionInfo(clientSocketId);
      expect(connectionInfo?.rooms).not.toContain('test-room');
    });

    it('should get room info', async () => {
      const joinRequest: JoinRoomRequest = {
        room: 'test-room',
      };

      await waitForEvent<void>(clientSocket, 'room-joined', () =>
        clientSocket.emit(WebSocketEvent.JOIN_ROOM, joinRequest)
      );

      const roomInfo = websocketService.getRoomInfo('test-room');
      expect(roomInfo).toBeDefined();
      expect(roomInfo?.name).toBe('test-room');
      expect(roomInfo?.memberCount).toBeGreaterThan(0);
      expect(roomInfo?.members).toContain(clientSocketId);
    });
  });

  describe('Messaging', () => {
    let client2: ClientSocket;

    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await listenServer(httpServer, testPort);

      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      client2 = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token-2',
          userId: 'user-456',
        },
        transports: ['websocket'],
      });

      await Promise.all([waitForConnect(clientSocket), waitForConnect(client2)]);
    });

    afterEach(() => {
      if (client2?.connected) {
        client2.disconnect();
      }
    });

    it('should send messages to room', async () => {
      // Both clients join same room
      await Promise.all([
        waitForEvent<void>(clientSocket, 'room-joined', () =>
          clientSocket.emit(WebSocketEvent.JOIN_ROOM, { room: 'test-room' })
        ),
        waitForEvent<void>(client2, 'room-joined', () =>
          client2.emit(WebSocketEvent.JOIN_ROOM, { room: 'test-room' })
        ),
      ]);

      // Send message from client1
      const message: Omit<MessagePayload, 'id' | 'timestamp'> = {
        from: 'user-123',
        room: 'test-room',
        content: 'Hello room!',
        type: MessageType.TEXT,
      };

      const receivedMessage = await waitForEvent<ReceivedMessage>(
        client2,
        WebSocketEvent.MESSAGE,
        () => clientSocket.emit(WebSocketEvent.MESSAGE, message)
      );

      expect(receivedMessage.content).toBe('Hello room!');
      expect(receivedMessage.room).toBe('test-room');
      expect(receivedMessage.id).toBeDefined();
      expect(receivedMessage.timestamp).toBeDefined();
    });

    it('should broadcast messages', async () => {
      const message: Omit<MessagePayload, 'id' | 'timestamp'> = {
        from: 'user-123',
        content: 'Hello everyone!',
        type: MessageType.TEXT,
      };

      const receivedMessage = await waitForEvent<ReceivedMessage>(
        client2,
        WebSocketEvent.MESSAGE,
        () => clientSocket.emit(WebSocketEvent.MESSAGE, message)
      );
      expect(receivedMessage.content).toBe('Hello everyone!');
    });
  });

  describe('Typing Indicators', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await listenServer(httpServer, testPort);

      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await waitForConnect(clientSocket);
    });

    it('should send typing-start event', async () => {
      const client2 = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token-2',
          userId: 'user-456',
        },
        transports: ['websocket'],
      });

      try {
        await waitForConnect(client2);
        const indicator = await waitForEvent<TypingIndicator>(
          client2,
          WebSocketEvent.TYPING_START,
          () => clientSocket.emit(WebSocketEvent.TYPING_START, {}),
          'Timed out waiting for typing-start'
        );
        expect(indicator.userId).toBe('user-123');
        expect(indicator.isTyping).toBe(true);
      } finally {
        if (client2.connected) {
          client2.disconnect();
        }
      }
    });

    it('should send typing-stop event', async () => {
      const client2 = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token-2',
          userId: 'user-456',
        },
        transports: ['websocket'],
      });

      try {
        await waitForConnect(client2);
        const indicator = await waitForEvent<TypingIndicator>(
          client2,
          WebSocketEvent.TYPING_STOP,
          () => clientSocket.emit(WebSocketEvent.TYPING_STOP, {}),
          'Timed out waiting for typing-stop'
        );
        expect(indicator.userId).toBe('user-123');
        expect(indicator.isTyping).toBe(false);
      } finally {
        if (client2.connected) {
          client2.disconnect();
        }
      }
    });
  });

  describe('Presence Updates', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await listenServer(httpServer, testPort);

      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await waitForConnect(clientSocket);
    });

    it('should broadcast presence updates', async () => {
      const client2 = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token-2',
          userId: 'user-456',
        },
        transports: ['websocket'],
      });

      try {
        await waitForConnect(client2);
        const presence = await waitForEvent<PresenceUpdate>(
          client2,
          WebSocketEvent.PRESENCE_UPDATE,
          () => clientSocket.emit(WebSocketEvent.PRESENCE_UPDATE, PresenceStatus.AWAY),
          'Timed out waiting for presence update'
        );
        expect(presence.userId).toBe('user-123');
        expect(presence.status).toBe(PresenceStatus.AWAY);
      } finally {
        if (client2.connected) {
          client2.disconnect();
        }
      }
    });
  });

  describe('Broadcasting', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await listenServer(httpServer, testPort);
    });

    it('should broadcast to all clients', async () => {
      const client1 = ioClient(`http://localhost:${testPort}`, {
        auth: { token: 'token1', userId: 'user1' },
        transports: ['websocket'],
      });

      const client2 = ioClient(`http://localhost:${testPort}`, {
        auth: { token: 'token2', userId: 'user2' },
        transports: ['websocket'],
      });

      await Promise.all([waitForConnect(client1), waitForConnect(client2)]);

      const broadcastData = { message: 'Hello everyone!' };

      const client1Data = waitForEvent<typeof broadcastData>(client1, 'broadcast');
      const client2Data = waitForEvent<typeof broadcastData>(client2, 'broadcast');

      websocketService.broadcast('broadcast', broadcastData);

      await Promise.all([
        client1Data.then((data) => expect(data).toEqual(broadcastData)),
        client2Data.then((data) => expect(data).toEqual(broadcastData)),
      ]);

      client1.disconnect();
      client2.disconnect();
    });

    it('should broadcast to specific room', async () => {
      const client1 = ioClient(`http://localhost:${testPort}`, {
        auth: { token: 'token1', userId: 'user1' },
        transports: ['websocket'],
      });

      const client2 = ioClient(`http://localhost:${testPort}`, {
        auth: { token: 'token2', userId: 'user2' },
        transports: ['websocket'],
      });

      await Promise.all([waitForConnect(client1), waitForConnect(client2)]);

      // Only client1 joins room
      await waitForEvent<void>(client1, 'room-joined', () =>
        client1.emit(WebSocketEvent.JOIN_ROOM, { room: 'room1' })
      );

      const roomData = { message: 'Room message!' };

      const client1Received = waitForEvent<typeof roomData>(client1, 'notification');
      let client2Notified = false;
      client2.once('notification', () => {
        client2Notified = true;
      });

      websocketService.broadcastToRoom('room1', 'notification', roomData);

      const received = await withTimeout(
        client1Received,
        DEFAULT_TIMEOUT_MS,
        'Timed out waiting for room notification'
      );
      expect(received).toEqual(roomData);

      await delay(500);
      expect(client2Notified).toBe(false);

      client1.disconnect();
      client2.disconnect();
    });
  });

  describe('Metrics and Health', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await listenServer(httpServer, testPort);
    });

    it('should return metrics', () => {
      const metrics = websocketService.getMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.totalConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.activeConnections).toBeGreaterThanOrEqual(0);
      expect(metrics.totalRooms).toBeGreaterThanOrEqual(0);
      expect(metrics.timestamp).toBeInstanceOf(Date);
    });

    it('should return health status', async () => {
      const health = await websocketService.getHealth();

      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.connections).toBeGreaterThanOrEqual(0);
      expect(health.rooms).toBeGreaterThanOrEqual(0);
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await websocketService.initialize(httpServer);
      await listenServer(httpServer, testPort);

      await websocketService.shutdown();

      expect(loggerService.info).toHaveBeenCalledWith('Shutting down WebSocket service...');
      expect(loggerService.info).toHaveBeenCalledWith('WebSocket service shut down successfully');
    });
  });
});
