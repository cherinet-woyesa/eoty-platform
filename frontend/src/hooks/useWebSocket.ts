import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface WebSocketOptions {
  onOpen?: () => void;
  onClose?: (reason: string) => void;
  onError?: (error: any) => void;
  onMessage?: (message: WebSocketMessage) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number; // Deprecated with socket.io but kept for interface compatibility
  disableReconnect?: boolean;
}

interface UseWebSocketReturn {
  lastMessage: MessageEvent | null;
  isConnected: boolean;
  sendMessage: (message: WebSocketMessage) => void;
  reconnect: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  messageHistory: WebSocketMessage[];
}

export function useWebSocket(
  url: string,
  options: WebSocketOptions = {}
): UseWebSocketReturn {
  const {
    onOpen,
    onClose,
    onError,
    onMessage,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    disableReconnect = false
  } = options;

  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([]);
  
  const socketRef = useRef<Socket | null>(null);
  const isManualClose = useRef(false);

  // WebSocket is DISABLED by default to avoid noisy errors and perf issues in dev.
  // Explicitly set VITE_ENABLE_WS=true in your .env to turn it on.
  const WS_ENABLED = import.meta.env.VITE_ENABLE_WS === 'true';
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  
  // Construct Socket.IO URL
  let defaultWsBase: string;
  if (import.meta.env.VITE_WS_URL) {
    defaultWsBase = import.meta.env.VITE_WS_URL;
  } else {
    try {
      const apiUrl = new URL(apiBase.replace('/api', ''));
      // Socket.IO client handles http/https and upgrades to ws/wss
      defaultWsBase = `${apiUrl.protocol}//${apiUrl.hostname}${apiUrl.port ? `:${apiUrl.port}` : ''}`;
    } catch (error) {
      console.error('Failed to parse API URL for WebSocket:', error);
      defaultWsBase = 'http://localhost:5000';
    }
  }
  const WS_BASE = defaultWsBase;

  const connect = useCallback(() => {
    if (!WS_ENABLED || isManualClose.current || disableReconnect) {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      return;
    }

    if (socketRef.current?.connected) {
      return;
    }

    setConnectionStatus('connecting');

    // Parse URL to extract query params for Socket.IO
    let queryParams: Record<string, string> = {};
    
    if (url.startsWith('?')) {
      const searchParams = new URLSearchParams(url);
      searchParams.forEach((value, key) => {
        queryParams[key] = value;
      });
    } else if (url.startsWith('/notifications/')) {
      const userId = url.split('/notifications/')[1];
      if (userId) {
        queryParams = { type: 'dashboard', userId };
      }
    } else if (url.startsWith('/collaboration/')) {
      const lessonId = url.split('/collaboration/')[1];
      if (lessonId) {
        queryParams = { lessonId };
      }
    }

    console.log('Connecting to Socket.IO with params:', queryParams);

    try {
      const socket = io(WS_BASE, {
        query: queryParams,
        reconnection: !disableReconnect,
        reconnectionAttempts: reconnectAttempts,
        reconnectionDelay: reconnectInterval,
        transports: ['websocket', 'polling'], // Prefer websocket
        withCredentials: true, // Ensure cookies/headers are sent
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        onOpen?.();
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected:', reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        onClose?.(reason);
      });

      socket.on('connect_error', (error) => {
        if (import.meta.env.DEV) {
          console.warn('Socket.IO connection error (non-critical):', error.message);
        }
        setConnectionStatus('error');
        onError?.(error);
      });

      // Handle 'dashboard_update' events
      socket.on('dashboard_update', (data) => {
        handleIncomingMessage(data);
      });

      // Handle 'progress' events
      socket.on('progress', (data) => {
        handleIncomingMessage({ type: 'progress', data });
      });

      // Handle generic messages if any
      socket.on('message', (data) => {
        handleIncomingMessage(data);
      });

      socketRef.current = socket;

    } catch (error) {
      console.error('Socket.IO initialization failed:', error);
      setConnectionStatus('error');
    }
  }, [url, WS_ENABLED, WS_BASE, onOpen, onClose, onError, reconnectAttempts, reconnectInterval, disableReconnect]);

  const handleIncomingMessage = useCallback((message: any) => {
    try {
      // Normalize message structure
      const webSocketMessage: WebSocketMessage = {
        type: message.type || 'unknown',
        data: message.data || message,
        timestamp: message.timestamp || Date.now()
      };

      // Create a synthetic MessageEvent for compatibility
      const syntheticEvent = {
        data: JSON.stringify(message),
        type: 'message',
        lastEventId: '',
        origin: WS_BASE,
        ports: [],
        source: null,
      } as unknown as MessageEvent;

      setLastMessage(syntheticEvent);
      setMessageHistory(prev => [...prev.slice(-99), webSocketMessage]);
      onMessage?.(webSocketMessage);

      console.log('Socket.IO message received:', webSocketMessage);
    } catch (error) {
      console.error('Error handling Socket.IO message:', error);
    }
  }, [WS_BASE, onMessage]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!WS_ENABLED || !socketRef.current || !socketRef.current.connected) {
      console.warn('Socket.IO not connected, message not sent:', message);
      return;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      
      // Emit based on type or generic 'message'
      socketRef.current.emit(message.type || 'message', messageWithTimestamp);
      
      setMessageHistory(prev => [...prev.slice(-99), messageWithTimestamp]);
      console.log('Socket.IO message sent:', messageWithTimestamp);
    } catch (error) {
      console.error('Failed to send Socket.IO message:', error);
    }
  }, [WS_ENABLED]);

  const reconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.connect();
    } else {
      isManualClose.current = false;
      connect();
    }
  }, [connect]);

  const closeConnection = useCallback(() => {
    isManualClose.current = true;
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  // Auto-connect on mount and cleanup on unmount
  useEffect(() => {
    connect();
    return () => {
      closeConnection();
    };
  }, [connect, closeConnection]);

  // Auto-reconnect when window gains focus
  useEffect(() => {
    const handleFocus = () => {
      if (!isConnected && connectionStatus === 'disconnected' && !disableReconnect) {
        reconnect();
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isConnected, connectionStatus, reconnect, disableReconnect]);

  return {
    lastMessage,
    isConnected,
    sendMessage,
    reconnect,
    connectionStatus,
    messageHistory
  };
}

// Specialized hook for real-time notifications
export function useNotificationsWebSocket(userId?: string) {
  const { lastMessage, ...rest } = useWebSocket(
    userId ? `/notifications/${userId}` : '',
    {
      onMessage: (message) => {
        if (message.type === 'notification') {
          // Show browser notification if permitted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('New Notification', {
              body: message.data.title,
              icon: '/icon.png'
            });
          }
        }
      },
      disableReconnect: !userId // Disable reconnection if no user ID
    }
  );

  return {
    ...rest,
    lastNotification: lastMessage ? JSON.parse(lastMessage.data) : null
  };
}

// Specialized hook for live collaboration
export function useCollaborationWebSocket(roomId: string) {
  return useWebSocket(`/collaboration/${roomId}`, {
    reconnectAttempts: 10, // More attempts for collaboration
    reconnectInterval: 1000, // Faster reconnection
    heartbeatInterval: 15000, // More frequent heartbeat
    disableReconnect: !roomId // Disable if no room ID
  });
}