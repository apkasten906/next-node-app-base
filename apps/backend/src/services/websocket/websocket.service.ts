import 'reflect-metadata';
import { Server as HttpServer } from 'http';

import {
  ClientToServerEvents,
  InterServerEvents,
  JoinRoomRequest,
  JoinRoomResponse,
  LeaveRoomRequest,
  LeaveRoomResponse,
  MessagePayload,
  PresenceStatus,
  PresenceUpdate,
  RoomInfo,
  ServerToClientEvents,
  SocketData,
  TypingIndicator,
  WebSocketAuthResult,
  WebSocketConfig,
  WebSocketConnectionInfo,
  WebSocketError,
  WebSocketErrorCode,
  WebSocketEvent,
  WebSocketHealthCheck,
  WebSocketMetrics,
} from '@repo/types';
import Redis from 'ioredis';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { createAdapter } from 'socket.io-redis-adapter';
import { injectable } from 'tsyringe';

import { LoggerService } from '../logger.service';

/**
 * WebSocket Service - Real-time bidirectional communication with Socket.io
 *
 * Features:
 * - Authentication middleware
 * - Room-based messaging
 * - Redis adapter for horizontal scaling
 * - Rate limiting
 * - Connection state management
 * - Comprehensive error handling
 * - Health checks and metrics
 */
@injectable()
export class WebSocketService {
  private io?: SocketIOServer<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >;
  private pubClient?: Redis;
  private subClient?: Redis;
  private connections: Map<string, WebSocketConnectionInfo> = new Map();
  private messageCount: number = 0;
  private errorCount: number = 0;
  private startTime: Date = new Date();
  private readonly config: WebSocketConfig;

  constructor(private logger: LoggerService) {
    this.config = {
      port: parseInt(process.env['WEBSOCKET_PORT'] || '3001', 10),
      path: process.env['WEBSOCKET_PATH'] || '/socket.io',
      cors: {
        origin: process.env['WEBSOCKET_CORS_ORIGIN']?.split(',') || ['http://localhost:3000'],
        credentials: true,
      },
      pingTimeout: parseInt(process.env['WEBSOCKET_PING_TIMEOUT'] || '60000', 10),
      pingInterval: parseInt(process.env['WEBSOCKET_PING_INTERVAL'] || '25000', 10),
      maxHttpBufferSize: parseInt(process.env['WEBSOCKET_MAX_BUFFER_SIZE'] || '1048576', 10), // 1MB
      transports: ['websocket', 'polling'],
      rateLimit: {
        maxConnections: parseInt(process.env['WEBSOCKET_MAX_CONNECTIONS'] || '1000', 10),
        windowMs: parseInt(process.env['WEBSOCKET_RATE_LIMIT_WINDOW'] || '60000', 10),
      },
    };
  }

  /**
   * Initialize WebSocket server
   */
  async initialize(httpServer: HttpServer): Promise<void> {
    try {
      if (!httpServer) {
        throw new Error('HTTP server is required for WebSocket initialization');
      }

      this.logger.info('Initializing WebSocket service...');

      // Create Socket.io server
      this.io = new SocketIOServer<
        ClientToServerEvents,
        ServerToClientEvents,
        InterServerEvents,
        SocketData
      >(httpServer, {
        path: this.config.path,
        cors: this.config.cors,
        pingTimeout: this.config.pingTimeout,
        pingInterval: this.config.pingInterval,
        maxHttpBufferSize: this.config.maxHttpBufferSize,
        transports: this.config.transports,
      });

      // Setup Redis adapter for horizontal scaling if Redis is configured
      if (process.env['REDIS_URL']) {
        await this.setupRedisAdapter();
      }

      // Setup middleware
      this.setupMiddleware();

      // Setup event handlers
      this.setupEventHandlers();

      this.logger.info('WebSocket service initialized successfully', {
        path: this.config.path,
        port: this.config.port,
        redisEnabled: !!process.env['REDIS_URL'],
      });
    } catch (error) {
      this.logger.error('Failed to initialize WebSocket service', error as Error);
      throw error;
    }
  }

  /**
   * Setup Redis adapter for horizontal scaling
   */
  private async setupRedisAdapter(): Promise<void> {
    try {
      const redisUrl = process.env['REDIS_URL'];
      if (!redisUrl) {
        return;
      }

      this.pubClient = new Redis(redisUrl, { lazyConnect: true });
      this.subClient = this.pubClient.duplicate();

      await Promise.all([this.pubClient.connect(), this.subClient.connect()]);

      if (this.io) {
        this.io.adapter(createAdapter(this.pubClient, this.subClient));
      }

      this.logger.info('Redis adapter configured for WebSocket scaling');
    } catch (error) {
      this.logger.error('Failed to setup Redis adapter', error as Error);
      // Don't throw - fallback to in-memory adapter
    }
  }

  /**
   * Setup authentication and rate limiting middleware
   */
  private setupMiddleware(): void {
    if (!this.io) return;

    // Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token = socket.handshake.auth['token'] as string;

        if (!token) {
          const error: WebSocketError = {
            code: WebSocketErrorCode.AUTHENTICATION_FAILED,
            message: 'Authentication token required',
            timestamp: new Date(),
          };
          return next(new Error(JSON.stringify(error)));
        }

        // TODO: Verify token with authentication service
        // For now, accept any token
        const authResult: WebSocketAuthResult = {
          success: true,
          userId: socket.handshake.auth['userId'] as string,
        };

        if (!authResult.success) {
          const error: WebSocketError = {
            code: WebSocketErrorCode.AUTHENTICATION_FAILED,
            message: 'Invalid authentication token',
            timestamp: new Date(),
          };
          return next(new Error(JSON.stringify(error)));
        }

        // Attach user data to socket
        socket.data.userId = authResult.userId;
        socket.data.sessionId = socket.id;
        socket.data.metadata = socket.handshake.auth['metadata'] as Record<string, unknown>;

        next();
      } catch (error) {
        this.logger.error('Authentication middleware error', error as Error);
        const wsError: WebSocketError = {
          code: WebSocketErrorCode.AUTHENTICATION_FAILED,
          message: 'Authentication failed',
          timestamp: new Date(),
        };
        next(new Error(JSON.stringify(wsError)));
      }
    });

    // Rate limiting middleware
    this.io.use((_socket, next) => {
      const maxConnections = this.config.rateLimit?.maxConnections || 1000;

      if (this.connections.size >= maxConnections) {
        const error: WebSocketError = {
          code: WebSocketErrorCode.RATE_LIMIT_EXCEEDED,
          message: 'Maximum connection limit reached',
          timestamp: new Date(),
        };
        return next(new Error(JSON.stringify(error)));
      }

      next();
    });
  }

  /**
   * Setup connection and message event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on(
      WebSocketEvent.CONNECTION,
      (
        socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
      ) => {
        this.handleConnection(socket);
      }
    );
  }

  /**
   * Handle new connection
   */
  private handleConnection(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ): void {
    const connectionInfo: WebSocketConnectionInfo = {
      socketId: socket.id,
      userId: socket.data.userId,
      connectedAt: new Date(),
      rooms: [],
      metadata: socket.data.metadata,
    };

    this.connections.set(socket.id, connectionInfo);

    this.logger.info('WebSocket client connected', {
      socketId: socket.id,
      userId: socket.data.userId,
    });

    // Setup socket event handlers
    this.setupSocketEventHandlers(socket);

    // Handle disconnect
    socket.on(WebSocketEvent.DISCONNECT, () => {
      this.handleDisconnect(socket);
    });

    // Handle errors
    socket.on(WebSocketEvent.ERROR, (error: Error) => {
      this.handleSocketError(socket, error);
    });
  }

  /**
   * Setup individual socket event handlers
   */
  private setupSocketEventHandlers(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ): void {
    // Join room
    socket.on(WebSocketEvent.JOIN_ROOM, (request: JoinRoomRequest) => {
      this.handleJoinRoom(socket, request);
    });

    // Leave room
    socket.on(WebSocketEvent.LEAVE_ROOM, (request: LeaveRoomRequest) => {
      this.handleLeaveRoom(socket, request);
    });

    // Message
    socket.on(WebSocketEvent.MESSAGE, (message: Omit<MessagePayload, 'id' | 'timestamp'>) => {
      this.handleMessage(socket, message);
    });

    // Typing indicators
    socket.on(WebSocketEvent.TYPING_START, (data: { room?: string }) => {
      this.handleTypingStart(socket, data.room);
    });

    socket.on(WebSocketEvent.TYPING_STOP, (data: { room?: string }) => {
      this.handleTypingStop(socket, data.room);
    });

    // Presence update
    socket.on(WebSocketEvent.PRESENCE_UPDATE, (status: PresenceStatus) => {
      this.handlePresenceUpdate(socket, status);
    });

    // Ping/pong for latency monitoring
    socket.on(WebSocketEvent.PING, () => {
      socket.emit(WebSocketEvent.PONG);
    });
  }

  /**
   * Handle join room request
   */
  private handleJoinRoom(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    request: JoinRoomRequest
  ): void {
    try {
      void socket.join(request.room);

      const connectionInfo = this.connections.get(socket.id);
      if (connectionInfo) {
        connectionInfo.rooms.push(request.room);
        this.connections.set(socket.id, connectionInfo);
      }

      const response: JoinRoomResponse = {
        success: true,
        room: request.room,
        memberCount: this.getRoomMemberCount(request.room),
      };

      socket.emit(WebSocketEvent.ROOM_JOINED, response);

      this.logger.debug('Client joined room', {
        socketId: socket.id,
        room: request.room,
      });
    } catch {
      const wsError: WebSocketError = {
        code: WebSocketErrorCode.INVALID_ROOM,
        message: 'Failed to join room',
        timestamp: new Date(),
      };

      socket.emit(WebSocketEvent.ROOM_ERROR, wsError);
      this.errorCount++;
    }
  }

  /**
   * Handle leave room request
   */
  private handleLeaveRoom(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    request: LeaveRoomRequest
  ): void {
    try {
      void socket.leave(request.room);

      const connectionInfo = this.connections.get(socket.id);
      if (connectionInfo) {
        connectionInfo.rooms = connectionInfo.rooms.filter((r: string) => r !== request.room);
        this.connections.set(socket.id, connectionInfo);
      }

      const response: LeaveRoomResponse = {
        success: true,
        room: request.room,
      };

      socket.emit(WebSocketEvent.ROOM_LEFT, response);

      this.logger.debug('Client left room', {
        socketId: socket.id,
        room: request.room,
      });
    } catch {
      const wsError: WebSocketError = {
        code: WebSocketErrorCode.INVALID_ROOM,
        message: 'Failed to leave room',
        timestamp: new Date(),
      };

      socket.emit(WebSocketEvent.ROOM_ERROR, wsError);
      this.errorCount++;
    }
  }

  /**
   * Handle message
   */
  private handleMessage(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    message: Omit<MessagePayload, 'id' | 'timestamp'>
  ): void {
    try {
      const fullMessage: MessagePayload = {
        ...message,
        id: this.generateMessageId(),
        timestamp: new Date(),
      };

      // Send to specific user or room
      if (message['to']) {
        socket.to(message['to'] as string).emit(WebSocketEvent.MESSAGE, fullMessage);
      } else if (message['room']) {
        socket.to(message['room'] as string).emit(WebSocketEvent.MESSAGE, fullMessage);
      } else {
        socket.broadcast.emit(WebSocketEvent.MESSAGE, fullMessage);
      }

      this.messageCount++;
    } catch {
      const wsError: WebSocketError = {
        code: WebSocketErrorCode.INVALID_MESSAGE,
        message: 'Failed to send message',
        timestamp: new Date(),
      };

      socket.emit(WebSocketEvent.ERROR, wsError);
      this.errorCount++;
    }
  }

  /**
   * Handle typing start
   */
  private handleTypingStart(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    room?: string
  ): void {
    const indicator: TypingIndicator = {
      userId: socket.data.userId || socket.id,
      room,
      isTyping: true,
      timestamp: new Date(),
    };

    if (room) {
      socket.to(room).emit(WebSocketEvent.TYPING_START, indicator);
    } else {
      socket.broadcast.emit(WebSocketEvent.TYPING_START, indicator);
    }
  }

  /**
   * Handle typing stop
   */
  private handleTypingStop(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    room?: string
  ): void {
    const indicator: TypingIndicator = {
      userId: socket.data.userId || socket.id,
      room,
      isTyping: false,
      timestamp: new Date(),
    };

    if (room) {
      socket.to(room).emit(WebSocketEvent.TYPING_STOP, indicator);
    } else {
      socket.broadcast.emit(WebSocketEvent.TYPING_STOP, indicator);
    }
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    status: PresenceStatus
  ): void {
    const presence: PresenceUpdate = {
      userId: socket.data.userId || socket.id,
      status,
      timestamp: new Date(),
    };

    socket.broadcast.emit(WebSocketEvent.PRESENCE_UPDATE, presence);
  }

  /**
   * Handle socket disconnect
   */
  private handleDisconnect(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  ): void {
    this.connections.delete(socket.id);

    this.logger.info('WebSocket client disconnected', {
      socketId: socket.id,
      userId: socket.data.userId,
    });
  }

  /**
   * Handle socket error
   */
  private handleSocketError(
    socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>,
    error: Error
  ): void {
    this.logger.error('WebSocket socket error', error, {
      socketId: socket.id,
    });

    this.errorCount++;
  }

  /**
   * Get room member count
   */
  private getRoomMemberCount(room: string): number {
    if (!this.io) return 0;
    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    return roomSockets ? roomSockets.size : 0;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get room info
   */
  getRoomInfo(room: string): RoomInfo | null {
    if (!this.io) return null;

    const roomSockets = this.io.sockets.adapter.rooms.get(room);
    if (!roomSockets) return null;

    return {
      name: room,
      memberCount: roomSockets.size,
      members: Array.from(roomSockets),
      createdAt: new Date(), // Not tracked currently
    };
  }

  /**
   * Get connection info
   */
  getConnectionInfo(socketId: string): WebSocketConnectionInfo | null {
    return this.connections.get(socketId) || null;
  }

  /**
   * Broadcast to all connections
   */
  broadcast(event: string, data: unknown): void {
    if (!this.io) return;
    this.io.emit(event as keyof ServerToClientEvents, data as never);
  }

  /**
   * Broadcast to specific room
   */
  broadcastToRoom(room: string, event: string, data: unknown): void {
    if (!this.io) return;
    this.io.to(room).emit(event as keyof ServerToClientEvents, data as never);
  }

  /**
   * Broadcast to specific user (all their connections)
   */
  broadcastToUser(userId: string, event: string, data: unknown): void {
    if (!this.io) return;

    for (const [socketId, connectionInfo] of this.connections.entries()) {
      if (connectionInfo.userId === userId) {
        this.io.to(socketId).emit(event as keyof ServerToClientEvents, data as never);
      }
    }
  }

  /**
   * Get metrics
   */
  getMetrics(): WebSocketMetrics {
    const uptime = Date.now() - this.startTime.getTime();
    const messagesPerSecond = this.messageCount / (uptime / 1000);

    return {
      totalConnections: this.connections.size,
      activeConnections: this.connections.size,
      totalRooms: this.io?.sockets.adapter.rooms.size || 0,
      messagesPerSecond,
      averageLatency: 0, // TODO: Implement latency tracking
      errorRate: this.errorCount / (uptime / 1000),
      timestamp: new Date(),
    };
  }

  /**
   * Get health check status
   */
  async getHealth(): Promise<WebSocketHealthCheck> {
    const uptime = Date.now() - this.startTime.getTime();
    const connections = this.connections.size;
    const rooms = this.io?.sockets.adapter.rooms.size || 0;

    const health: WebSocketHealthCheck = {
      status: connections > 0 ? 'healthy' : 'degraded',
      connections,
      rooms,
      uptime,
      timestamp: new Date(),
    };

    // Check Redis connection if configured
    if (this.pubClient) {
      try {
        const start = Date.now();
        await this.pubClient.ping();
        const latency = Date.now() - start;

        health.redis = {
          connected: true,
          latency,
        };
      } catch {
        health.redis = {
          connected: false,
        };
        health.status = 'degraded';
      }
    }

    return health;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    try {
      this.logger.info('Shutting down WebSocket service...');

      // Close all connections
      if (this.io) {
        await this.io.close();
      }

      // Close Redis connections
      if (this.pubClient) {
        await this.pubClient.quit();
      }
      if (this.subClient) {
        await this.subClient.quit();
      }

      this.connections.clear();

      this.logger.info('WebSocket service shut down successfully');
    } catch (error) {
      this.logger.error('Error during WebSocket service shutdown', error as Error);
      throw error;
    }
  }
}
