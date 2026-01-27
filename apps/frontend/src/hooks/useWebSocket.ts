'use client';

import type {
  ClientToServerEvents,
  JoinRoomRequest,
  JoinRoomResponse,
  LeaveRoomRequest,
  LeaveRoomResponse,
  MessagePayload,
  PresenceStatus,
  ServerToClientEvents,
  WebSocketError,
} from '@repo/types';
import { ConnectionState, WebSocketEvent } from '@repo/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * WebSocket hook configuration
 */
export interface UseWebSocketOptions {
  url?: string;
  path?: string;
  autoConnect?: boolean;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  token?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: WebSocketError) => void;
  onReconnect?: (attempt: number) => void;
}

/**
 * WebSocket hook return type
 */
export interface UseWebSocketReturn {
  socket: Socket<ServerToClientEvents, ClientToServerEvents> | null;
  connectionState: ConnectionState;
  isConnected: boolean;
  isReconnecting: boolean;
  connect: () => void;
  disconnect: () => void;
  joinRoom: (request: JoinRoomRequest) => Promise<JoinRoomResponse>;
  leaveRoom: (request: LeaveRoomRequest) => Promise<LeaveRoomResponse>;
  sendMessage: (message: Omit<MessagePayload, 'id' | 'timestamp'>) => void;
  startTyping: (room?: string) => void;
  stopTyping: (room?: string) => void;
  updatePresence: (status: PresenceStatus) => void;
  on: <K extends keyof ServerToClientEvents>(event: K, handler: ServerToClientEvents[K]) => void;
  off: <K extends keyof ServerToClientEvents>(event: K, handler?: ServerToClientEvents[K]) => void;
}

/**
 * React hook for Socket.io client
 *
 * Features:
 * - Automatic connection/reconnection
 * - Connection state management
 * - Event subscriptions
 * - Room management
 * - Typing indicators
 * - Presence updates
 * - Error handling
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { isConnected, joinRoom, sendMessage, on } = useWebSocket({
 *     token: 'auth-token',
 *     userId: 'user-123',
 *     autoConnect: true,
 *   });
 *
 *   useEffect(() => {
 *     if (isConnected) {
 *       joinRoom({ room: 'chat-room' });
 *     }
 *   }, [isConnected, joinRoom]);
 *
 *   useEffect(() => {
 *     const handleMessage = (message: MessagePayload) => {
 *       console.log('Received message:', message);
 *     };
 *
 *     on(WebSocketEvent.MESSAGE, handleMessage);
 *     return () => off(WebSocketEvent.MESSAGE, handleMessage);
 *   }, [on, off]);
 *
 *   return (
 *     <div>
 *       <p>Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
 *       <button onClick={() => sendMessage({ content: 'Hello!', type: MessageType.TEXT })}>
 *         Send Message
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const {
    url = process.env['NEXT_PUBLIC_WEBSOCKET_URL'] || 'http://localhost:3001',
    path = '/socket.io',
    autoConnect = true,
    reconnection = true,
    reconnectionAttempts = 5,
    reconnectionDelay = 1000,
    token,
    userId,
    metadata,
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    ConnectionState.DISCONNECTED
  );
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  // Create socket instance
  useEffect(() => {
    if (socketRef.current) {
      return;
    }

    const socket = io(url, {
      path,
      autoConnect,
      reconnection,
      reconnectionAttempts,
      reconnectionDelay,
      auth: {
        token,
        userId,
        metadata,
      },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    // Setup event listeners
    socket.on('connect', () => {
      setConnectionState(ConnectionState.CONNECTED);
      onConnect?.();
    });

    socket.on('disconnect', (reason) => {
      setConnectionState(ConnectionState.DISCONNECTED);
      onDisconnect?.(reason);
    });

    socket.on('connect_error', (error) => {
      setConnectionState(ConnectionState.ERROR);
      try {
        const wsError = JSON.parse(error.message) as WebSocketError;
        onError?.(wsError);
      } catch {
        onError?.({
          code: 'UNKNOWN_ERROR' as never,
          message: error.message,
          timestamp: new Date(),
        });
      }
    });

    socket.io.on('reconnect_attempt', () => {
      setConnectionState(ConnectionState.RECONNECTING);
    });

    socket.io.on('reconnect', (attempt) => {
      setConnectionState(ConnectionState.CONNECTED);
      onReconnect?.(attempt);
    });

    socket.io.on('reconnect_error', () => {
      setConnectionState(ConnectionState.ERROR);
    });

    socket.io.on('reconnect_failed', () => {
      setConnectionState(ConnectionState.DISCONNECTED);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Connect function
  const connect = useCallback(() => {
    if (socketRef.current && !socketRef.current.connected) {
      setConnectionState(ConnectionState.CONNECTING);
      socketRef.current.connect();
    }
  }, []);

  // Disconnect function
  const disconnect = useCallback(() => {
    if (socketRef.current && socketRef.current.connected) {
      setConnectionState(ConnectionState.DISCONNECTING);
      socketRef.current.disconnect();
    }
  }, []);

  // Join room
  const joinRoom = useCallback(async (request: JoinRoomRequest): Promise<JoinRoomResponse> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Join room timeout'));
      }, 5000);

      const handleJoined = (response: JoinRoomResponse): void => {
        clearTimeout(timeout);
        socketRef.current?.off(WebSocketEvent.ROOM_JOINED, handleJoined);
        socketRef.current?.off(WebSocketEvent.ROOM_ERROR, handleError);
        resolve(response);
      };

      const handleError = (error: WebSocketError): void => {
        clearTimeout(timeout);
        socketRef.current?.off(WebSocketEvent.ROOM_JOINED, handleJoined);
        socketRef.current?.off(WebSocketEvent.ROOM_ERROR, handleError);
        reject(error);
      };

      socketRef.current.once(WebSocketEvent.ROOM_JOINED, handleJoined);
      socketRef.current.once(WebSocketEvent.ROOM_ERROR, handleError);
      socketRef.current.emit(WebSocketEvent.JOIN_ROOM, request);
    });
  }, []);

  // Leave room
  const leaveRoom = useCallback(async (request: LeaveRoomRequest): Promise<LeaveRoomResponse> => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current) {
        reject(new Error('Socket not initialized'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('Leave room timeout'));
      }, 5000);

      const handleLeft = (response: LeaveRoomResponse): void => {
        clearTimeout(timeout);
        socketRef.current?.off(WebSocketEvent.ROOM_LEFT, handleLeft);
        socketRef.current?.off(WebSocketEvent.ROOM_ERROR, handleError);
        resolve(response);
      };

      const handleError = (error: WebSocketError): void => {
        clearTimeout(timeout);
        socketRef.current?.off(WebSocketEvent.ROOM_LEFT, handleLeft);
        socketRef.current?.off(WebSocketEvent.ROOM_ERROR, handleError);
        reject(error);
      };

      socketRef.current.once(WebSocketEvent.ROOM_LEFT, handleLeft);
      socketRef.current.once(WebSocketEvent.ROOM_ERROR, handleError);
      socketRef.current.emit(WebSocketEvent.LEAVE_ROOM, request);
    });
  }, []);

  // Send message
  const sendMessage = useCallback((message: Omit<MessagePayload, 'id' | 'timestamp'>) => {
    if (socketRef.current) {
      socketRef.current.emit(WebSocketEvent.MESSAGE, message);
    }
  }, []);

  // Start typing
  const startTyping = useCallback((room?: string) => {
    if (socketRef.current) {
      socketRef.current.emit(WebSocketEvent.TYPING_START, { room });
    }
  }, []);

  // Stop typing
  const stopTyping = useCallback((room?: string) => {
    if (socketRef.current) {
      socketRef.current.emit(WebSocketEvent.TYPING_STOP, { room });
    }
  }, []);

  // Update presence
  const updatePresence = useCallback((status: PresenceStatus) => {
    if (socketRef.current) {
      socketRef.current.emit(WebSocketEvent.PRESENCE_UPDATE, status);
    }
  }, []);

  // Subscribe to events
  const on = useCallback(
    <K extends keyof ServerToClientEvents>(event: K, handler: ServerToClientEvents[K]) => {
      if (socketRef.current) {
        socketRef.current.on(event, handler);
      }
    },
    []
  );

  // Unsubscribe from events
  const off = useCallback(
    <K extends keyof ServerToClientEvents>(event: K, handler?: ServerToClientEvents[K]) => {
      if (socketRef.current) {
        if (handler) {
          socketRef.current.off(event, handler);
        } else {
          socketRef.current.off(event);
        }
      }
    },
    []
  );

  return {
    socket: socketRef.current,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    isReconnecting: connectionState === ConnectionState.RECONNECTING,
    connect,
    disconnect,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    updatePresence,
    on,
    off,
  };
}
