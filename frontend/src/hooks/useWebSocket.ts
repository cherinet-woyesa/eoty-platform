import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface WebSocketOptions {
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (error: Event) => void;
  onMessage?: (message: WebSocketMessage) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
  disableReconnect?: boolean; // New option to disable reconnection
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
    heartbeatInterval = 30000,
    disableReconnect = false // New option
  } = options;

  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [messageHistory, setMessageHistory] = useState<WebSocketMessage[]>([]);
  
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const heartbeatTimer = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimer = useRef<NodeJS.Timeout | null>(null);
  const isManualClose = useRef(false); // Track manual closure

  const WS_ENABLED = import.meta.env.VITE_ENABLE_WS !== 'false'; // Default to true
  // Use the same host as the API, but with ws/wss protocol
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
  
  // Construct WebSocket URL properly
  let defaultWsBase: string;
  if (import.meta.env.VITE_WS_URL) {
    // Use explicit WebSocket URL if provided
    defaultWsBase = import.meta.env.VITE_WS_URL;
  } else {
    // Construct from API base URL
    try {
      const apiUrl = new URL(apiBase.replace('/api', ''));
      const wsProtocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      // For production, don't include port if it's standard (80/443)
      const port = apiUrl.port 
        ? `:${apiUrl.port}` 
        : (apiUrl.protocol === 'https:' ? '' : (apiUrl.hostname === 'localhost' ? ':5000' : ''));
      defaultWsBase = `${wsProtocol}//${apiUrl.hostname}${port}`;
    } catch (error) {
      console.error('Failed to parse API URL for WebSocket:', error);
      // Fallback to localhost
      defaultWsBase = 'ws://localhost:5000';
    }
  }
  const WS_BASE = defaultWsBase;

  const cleanup = useCallback(() => {
    if (heartbeatTimer.current) {
      clearInterval(heartbeatTimer.current);
      heartbeatTimer.current = null;
    }
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    // Don't reconnect if manually closed or reconnection disabled
    if (!WS_ENABLED || isManualClose.current || disableReconnect) {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      return;
    }

    try {
      setConnectionStatus('connecting');
      const socket = new WebSocket(`${WS_BASE}${url}`);
      
      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectCount.current = 0;
        onOpen?.();

        // Start heartbeat
        heartbeatTimer.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'heartbeat',
              data: { timestamp: Date.now() },
              timestamp: Date.now()
            }));
          }
        }, heartbeatInterval);
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          // Handle heartbeat response
          if (message.type === 'heartbeat') {
            return;
          }

          setLastMessage(event);
          
          const webSocketMessage: WebSocketMessage = {
            type: message.type,
            data: message.data,
            timestamp: message.timestamp || Date.now()
          };

          setMessageHistory(prev => [...prev.slice(-99), webSocketMessage]); // Keep last 100 messages
          onMessage?.(webSocketMessage);

          // Log message for debugging
          console.log('WebSocket message received:', webSocketMessage);

        } catch (error) {
          console.error('Failed to parse WebSocket message:', error, event.data);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        setConnectionStatus('disconnected');
        cleanup();
        onClose?.(event);

        // Don't attempt reconnection if manually closed
        if (!isManualClose.current && !disableReconnect) {
          // Attempt reconnection with exponential backoff
          if (reconnectCount.current < reconnectAttempts) {
            reconnectCount.current++;
            console.log(`Attempting to reconnect... (${reconnectCount.current}/${reconnectAttempts})`);
            
            reconnectTimer.current = setTimeout(() => {
              connect();
            }, reconnectInterval * Math.min(reconnectCount.current, 4)); // Cap exponential backoff
          } else {
            setConnectionStatus('error');
            console.error('Max reconnection attempts reached');
          }
        }
        
        // Reset manual close flag after handling
        if (isManualClose.current) {
          isManualClose.current = false;
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        onError?.(error);
      };

      ws.current = socket;

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    }
  }, [url, WS_ENABLED, WS_BASE, onOpen, onClose, onError, onMessage, reconnectAttempts, reconnectInterval, heartbeatInterval, cleanup, disableReconnect]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (!WS_ENABLED || !ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not connected, message not sent:', message);
      return;
    }

    try {
      const messageWithTimestamp = {
        ...message,
        timestamp: Date.now()
      };
      
      ws.current.send(JSON.stringify(messageWithTimestamp));
      
      // Add to local history for immediate feedback
      setMessageHistory(prev => [...prev.slice(-99), messageWithTimestamp]);
      
      console.log('WebSocket message sent:', messageWithTimestamp);
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
    }
  }, [WS_ENABLED]);

  const reconnect = useCallback(() => {
    cleanup();
    reconnectCount.current = 0;
    isManualClose.current = false; // Allow reconnection
    connect();
  }, [cleanup, connect]);

  const closeConnection = useCallback(() => {
    isManualClose.current = true; // Mark as manual closure
    if (ws.current) {
      ws.current.close(1000, 'Manual closure'); // Normal closure
    }
    cleanup();
  }, [cleanup]);

  // Auto-connect on mount and cleanup on unmount
  useEffect(() => {
    connect();

    return () => {
      closeConnection();
    };
  }, [connect, closeConnection]);

  // Auto-reconnect when window gains focus (only if not connected)
  useEffect(() => {
    const handleFocus = () => {
      if (!isConnected && connectionStatus === 'disconnected' && !disableReconnect) {
        reconnect();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isConnected, connectionStatus, reconnect, disableReconnect]);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      if (!isConnected && !disableReconnect) {
        console.log('Network back online, attempting reconnect...');
        reconnect();
      }
    };

    const handleOffline = () => {
      console.log('Network offline, WebSocket may disconnect');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isConnected, reconnect, disableReconnect]);

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