import { Server as HttpServer } from 'http';

import {
  JoinRoomRequest,
  LeaveRoomRequest,
  MessagePayload,
  MessageType,
  PresenceStatus,
  WebSocketEvent,
} from '@repo/types';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LoggerService } from '../../services/logger.service';
import { WebSocketService } from '../../services/websocket/websocket.service';

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
    httpServer = (await import('http')).createServer(app);

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
      await new Promise<void>((resolve) => {
        httpServer.close(() => resolve());
      });
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
      await new Promise<void>((resolve) => {
        httpServer.listen(testPort, () => resolve());
      });
    });

    it('should accept client connections with valid token', (done) => {
      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    it('should reject connections without token', (done) => {
      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {}, // No token
        transports: ['websocket'],
      });

      clientSocket.on('connect_error', (error) => {
        expect(error.message).toContain('AUTHENTICATION_FAILED');
        done();
      });
    });

    it('should track connection info', async () => {
      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });

      const connectionInfo = websocketService.getConnectionInfo(clientSocket.id);
      expect(connectionInfo).toBeDefined();
      expect(connectionInfo?.userId).toBe('user-123');
      expect(connectionInfo?.socketId).toBe(clientSocket.id);
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

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });

      const socketId = clientSocket.id;
      clientSocket.disconnect();

      await new Promise<void>((resolve) => setTimeout(resolve, 100));

      const connectionInfo = websocketService.getConnectionInfo(socketId);
      expect(connectionInfo).toBeNull();
    });
  });

  describe('Room Management', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await new Promise<void>((resolve) => {
        httpServer.listen(testPort, () => resolve());
      });

      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });
    });

    it('should allow joining a room', (done) => {
      const joinRequest: JoinRoomRequest = {
        room: 'test-room',
      };

      clientSocket.once('room-joined', (response) => {
        expect(response.success).toBe(true);
        expect(response.room).toBe('test-room');
        expect(response.memberCount).toBeGreaterThan(0);
        done();
      });

      clientSocket.emit(WebSocketEvent.JOIN_ROOM, joinRequest);
    });

    it('should track rooms in connection info', async () => {
      const joinRequest: JoinRoomRequest = {
        room: 'test-room',
      };

      await new Promise<void>((resolve) => {
        clientSocket.once('room-joined', () => resolve());
        clientSocket.emit(WebSocketEvent.JOIN_ROOM, joinRequest);
      });

      const connectionInfo = websocketService.getConnectionInfo(clientSocket.id);
      expect(connectionInfo?.rooms).toContain('test-room');
    });

    it('should allow leaving a room', async () => {
      // First join a room
      const joinRequest: JoinRoomRequest = {
        room: 'test-room',
      };

      await new Promise<void>((resolve) => {
        clientSocket.once('room-joined', () => resolve());
        clientSocket.emit(WebSocketEvent.JOIN_ROOM, joinRequest);
      });

      // Then leave it
      const leaveRequest: LeaveRoomRequest = {
        room: 'test-room',
      };

      await new Promise<void>((resolve) => {
        clientSocket.once('room-left', (response) => {
          expect(response.success).toBe(true);
          expect(response.room).toBe('test-room');
          resolve();
        });

        clientSocket.emit(WebSocketEvent.LEAVE_ROOM, leaveRequest);
      });

      const connectionInfo = websocketService.getConnectionInfo(clientSocket.id);
      expect(connectionInfo?.rooms).not.toContain('test-room');
    });

    it('should get room info', async () => {
      const joinRequest: JoinRoomRequest = {
        room: 'test-room',
      };

      await new Promise<void>((resolve) => {
        clientSocket.once('room-joined', () => resolve());
        clientSocket.emit(WebSocketEvent.JOIN_ROOM, joinRequest);
      });

      const roomInfo = websocketService.getRoomInfo('test-room');
      expect(roomInfo).toBeDefined();
      expect(roomInfo?.name).toBe('test-room');
      expect(roomInfo?.memberCount).toBeGreaterThan(0);
      expect(roomInfo?.members).toContain(clientSocket.id);
    });
  });

  describe('Messaging', () => {
    let client2: ClientSocket;

    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await new Promise<void>((resolve) => {
        httpServer.listen(testPort, () => resolve());
      });

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

      await Promise.all([
        new Promise<void>((resolve) => clientSocket.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);
    });

    afterEach(() => {
      if (client2?.connected) {
        client2.disconnect();
      }
    });

    it('should send messages to room', async () => {
      // Both clients join same room
      await Promise.all([
        new Promise<void>((resolve) => {
          clientSocket.once('room-joined', () => resolve());
          clientSocket.emit(WebSocketEvent.JOIN_ROOM, { room: 'test-room' });
        }),
        new Promise<void>((resolve) => {
          client2.once('room-joined', () => resolve());
          client2.emit(WebSocketEvent.JOIN_ROOM, { room: 'test-room' });
        }),
      ]);

      // Send message from client1
      const message: Omit<MessagePayload, 'id' | 'timestamp'> = {
        from: 'user-123',
        room: 'test-room',
        content: 'Hello room!',
        type: MessageType.TEXT,
      };

      await new Promise<void>((resolve) => {
        client2.once(WebSocketEvent.MESSAGE, (receivedMessage) => {
          expect(receivedMessage.content).toBe('Hello room!');
          expect(receivedMessage.room).toBe('test-room');
          expect(receivedMessage.id).toBeDefined();
          expect(receivedMessage.timestamp).toBeDefined();
          resolve();
        });

        clientSocket.emit(WebSocketEvent.MESSAGE, message);
      });
    });

    it('should broadcast messages', async () => {
      const message: Omit<MessagePayload, 'id' | 'timestamp'> = {
        from: 'user-123',
        content: 'Hello everyone!',
        type: MessageType.TEXT,
      };

      await new Promise<void>((resolve) => {
        client2.once(WebSocketEvent.MESSAGE, (receivedMessage) => {
          expect(receivedMessage.content).toBe('Hello everyone!');
          resolve();
        });

        clientSocket.emit(WebSocketEvent.MESSAGE, message);
      });
    });
  });

  describe('Typing Indicators', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await new Promise<void>((resolve) => {
        httpServer.listen(testPort, () => resolve());
      });

      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });
    });

    it('should send typing-start event', (done) => {
      const client2 = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token-2',
          userId: 'user-456',
        },
        transports: ['websocket'],
      });

      client2.on('connect', () => {
        client2.once(WebSocketEvent.TYPING_START, (indicator) => {
          expect(indicator.userId).toBe('user-123');
          expect(indicator.isTyping).toBe(true);
          client2.disconnect();
          done();
        });

        clientSocket.emit(WebSocketEvent.TYPING_START, {});
      });
    });

    it('should send typing-stop event', (done) => {
      const client2 = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token-2',
          userId: 'user-456',
        },
        transports: ['websocket'],
      });

      client2.on('connect', () => {
        client2.once(WebSocketEvent.TYPING_STOP, (indicator) => {
          expect(indicator.userId).toBe('user-123');
          expect(indicator.isTyping).toBe(false);
          client2.disconnect();
          done();
        });

        clientSocket.emit(WebSocketEvent.TYPING_STOP, {});
      });
    });
  });

  describe('Presence Updates', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await new Promise<void>((resolve) => {
        httpServer.listen(testPort, () => resolve());
      });

      clientSocket = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token',
          userId: 'user-123',
        },
        transports: ['websocket'],
      });

      await new Promise<void>((resolve) => {
        clientSocket.on('connect', () => resolve());
      });
    });

    it('should broadcast presence updates', (done) => {
      const client2 = ioClient(`http://localhost:${testPort}`, {
        auth: {
          token: 'valid-token-2',
          userId: 'user-456',
        },
        transports: ['websocket'],
      });

      client2.on('connect', () => {
        client2.once(WebSocketEvent.PRESENCE_UPDATE, (presence) => {
          expect(presence.userId).toBe('user-123');
          expect(presence.status).toBe(PresenceStatus.AWAY);
          client2.disconnect();
          done();
        });

        clientSocket.emit(WebSocketEvent.PRESENCE_UPDATE, PresenceStatus.AWAY);
      });
    });
  });

  describe('Broadcasting', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await new Promise<void>((resolve) => {
        httpServer.listen(testPort, () => resolve());
      });
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

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      const broadcastData = { message: 'Hello everyone!' };

      await Promise.all([
        new Promise<void>((resolve) => {
          client1.once('broadcast', (data) => {
            expect(data).toEqual(broadcastData);
            resolve();
          });
        }),
        new Promise<void>((resolve) => {
          client2.once('broadcast', (data) => {
            expect(data).toEqual(broadcastData);
            resolve();
          });
        }),
        websocketService.broadcast('broadcast', broadcastData),
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

      await Promise.all([
        new Promise<void>((resolve) => client1.on('connect', () => resolve())),
        new Promise<void>((resolve) => client2.on('connect', () => resolve())),
      ]);

      // Only client1 joins room
      await new Promise<void>((resolve) => {
        client1.once('room-joined', () => resolve());
        client1.emit(WebSocketEvent.JOIN_ROOM, { room: 'room1' });
      });

      const roomData = { message: 'Room message!' };

      const client1Received = new Promise<void>((resolve) => {
        client1.once('notification', (data) => {
          expect(data).toEqual(roomData);
          resolve();
        });
      });

      const client2Timeout = new Promise<void>((resolve) => {
        setTimeout(() => resolve(), 500); // Client2 should not receive
      });

      websocketService.broadcastToRoom('room1', 'notification', roomData);

      await Promise.race([client1Received, client2Timeout]);

      client1.disconnect();
      client2.disconnect();
    });
  });

  describe('Metrics and Health', () => {
    beforeEach(async () => {
      await websocketService.initialize(httpServer);
      await new Promise<void>((resolve) => {
        httpServer.listen(testPort, () => resolve());
      });
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
      await new Promise<void>((resolve) => {
        httpServer.listen(testPort, () => resolve());
      });

      await websocketService.shutdown();

      expect(loggerService.info).toHaveBeenCalledWith('Shutting down WebSocket service...');
      expect(loggerService.info).toHaveBeenCalledWith('WebSocket service shut down successfully');
    });
  });
});
