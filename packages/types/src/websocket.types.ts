/**
 * WebSocket event types and interfaces for real-time bidirectional communication
 *
 * This module provides type-safe definitions for Socket.io events, messages,
 * rooms, and connection states.
 */

/**
 * WebSocket connection states
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

/**
 * Standard WebSocket events
 */
export enum WebSocketEvent {
  // Connection events
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECT_FAILED = 'reconnect_failed',

  // Room events
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  ROOM_JOINED = 'room-joined',
  ROOM_LEFT = 'room-left',
  ROOM_ERROR = 'room-error',

  // Message events
  MESSAGE = 'message',
  TYPING_START = 'typing-start',
  TYPING_STOP = 'typing-stop',
  PRESENCE_UPDATE = 'presence-update',

  // Broadcast events
  BROADCAST = 'broadcast',
  NOTIFICATION = 'notification',

  // System events
  ERROR = 'error',
  PING = 'ping',
  PONG = 'pong',
}

/**
 * User presence status
 */
export enum PresenceStatus {
  ONLINE = 'online',
  AWAY = 'away',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

/**
 * WebSocket error codes
 */
export enum WebSocketErrorCode {
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  AUTHORIZATION_FAILED = 'AUTHORIZATION_FAILED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_ROOM = 'INVALID_ROOM',
  INVALID_MESSAGE = 'INVALID_MESSAGE',
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * WebSocket error
 */
export interface WebSocketError {
  code: WebSocketErrorCode;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * WebSocket connection info
 */
export interface WebSocketConnectionInfo {
  socketId: string;
  userId?: string;
  connectedAt: Date;
  rooms: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Room information
 */
export interface RoomInfo {
  name: string;
  memberCount: number;
  members: string[]; // socket IDs
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Join room request
 */
export interface JoinRoomRequest {
  room: string;
  metadata?: Record<string, unknown>;
}

/**
 * Join room response
 */
export interface JoinRoomResponse {
  success: boolean;
  room: string;
  memberCount: number;
  error?: WebSocketError;
}

/**
 * Leave room request
 */
export interface LeaveRoomRequest {
  room: string;
}

/**
 * Leave room response
 */
export interface LeaveRoomResponse {
  success: boolean;
  room: string;
  error?: WebSocketError;
}

/**
 * Message payload
 */
export interface MessagePayload {
  id: string;
  from: string; // socket ID or user ID
  to?: string; // optional: specific recipient
  room?: string; // optional: room name
  content: string;
  type: MessageType;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

/**
 * Message types
 */
export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
  SYSTEM = 'system',
  NOTIFICATION = 'notification',
}

/**
 * Typing indicator
 */
export interface TypingIndicator {
  userId: string;
  room?: string;
  isTyping: boolean;
  timestamp: Date;
}

/**
 * Presence update
 */
export interface PresenceUpdate {
  userId: string;
  status: PresenceStatus;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Broadcast message
 */
export interface BroadcastMessage {
  event: string;
  data: unknown;
  rooms?: string[];
  excludeSockets?: string[];
}

/**
 * WebSocket authentication payload
 */
export interface WebSocketAuthPayload {
  token: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket authentication result
 */
export interface WebSocketAuthResult {
  success: boolean;
  userId?: string;
  error?: WebSocketError;
}

/**
 * Server-to-client events map
 */
export interface ServerToClientEvents {
  [WebSocketEvent.ROOM_JOINED]: (response: JoinRoomResponse) => void;
  [WebSocketEvent.ROOM_LEFT]: (response: LeaveRoomResponse) => void;
  [WebSocketEvent.ROOM_ERROR]: (error: WebSocketError) => void;
  [WebSocketEvent.MESSAGE]: (message: MessagePayload) => void;
  [WebSocketEvent.TYPING_START]: (indicator: TypingIndicator) => void;
  [WebSocketEvent.TYPING_STOP]: (indicator: TypingIndicator) => void;
  [WebSocketEvent.PRESENCE_UPDATE]: (presence: PresenceUpdate) => void;
  [WebSocketEvent.BROADCAST]: (data: BroadcastMessage) => void;
  [WebSocketEvent.NOTIFICATION]: (notification: unknown) => void;
  [WebSocketEvent.ERROR]: (error: WebSocketError) => void;
  [WebSocketEvent.PONG]: () => void;
}

/**
 * Client-to-server events map
 */
export interface ClientToServerEvents {
  [WebSocketEvent.JOIN_ROOM]: (request: JoinRoomRequest) => void;
  [WebSocketEvent.LEAVE_ROOM]: (request: LeaveRoomRequest) => void;
  [WebSocketEvent.MESSAGE]: (message: Omit<MessagePayload, 'id' | 'timestamp'>) => void;
  [WebSocketEvent.TYPING_START]: (data: { room?: string }) => void;
  [WebSocketEvent.TYPING_STOP]: (data: { room?: string }) => void;
  [WebSocketEvent.PRESENCE_UPDATE]: (status: PresenceStatus) => void;
  [WebSocketEvent.PING]: () => void;
}

/**
 * Inter-server events (for Socket.io adapter)
 */
export interface InterServerEvents {
  ping: () => void;
}

/**
 * Socket data (attached to each socket instance)
 */
export interface SocketData {
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * WebSocket service configuration
 */
export interface WebSocketConfig {
  port?: number;
  path?: string;
  cors?: {
    origin: string | string[];
    credentials?: boolean;
  };
  pingTimeout?: number;
  pingInterval?: number;
  maxHttpBufferSize?: number;
  allowEIO3?: boolean;
  transports?: ('websocket' | 'polling')[];
  redis?: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  rateLimit?: {
    maxConnections?: number;
    windowMs?: number;
    message?: string;
  };
}

/**
 * WebSocket metrics
 */
export interface WebSocketMetrics {
  totalConnections: number;
  activeConnections: number;
  totalRooms: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  timestamp: Date;
}

/**
 * WebSocket health check result
 */
export interface WebSocketHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connections: number;
  rooms: number;
  uptime: number;
  redis?: {
    connected: boolean;
    latency?: number;
  };
  timestamp: Date;
}
