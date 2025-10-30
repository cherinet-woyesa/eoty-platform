import { useState, useEffect, useRef } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
}

export function useWebSocket(url: string) {
  const [lastMessage, setLastMessage] = useState<MessageEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const WS_ENABLED = import.meta.env.VITE_ENABLE_WS === 'true';
  const defaultWsBase = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:3001`;
  const WS_BASE = (import.meta.env.VITE_WS_URL as string) || defaultWsBase;

  useEffect(() => {
    if (!WS_ENABLED) {
      setIsConnected(false);
      return;
    }
    // Create WebSocket connection (fail-safe in dev if server is unavailable)
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(`${WS_BASE}${url}`);
    } catch (err) {
      console.warn('WebSocket unavailable, continuing without realtime:', err);
      setIsConnected(false);
      return;
    }
    
    socket.onopen = () => {
      setIsConnected(true);
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      setLastMessage(event);
    };

    socket.onclose = () => {
      setIsConnected(false);
      // Avoid noisy logs if server not running
      console.debug('WebSocket disconnected');
    };

    socket.onerror = (error) => {
      // Keep this quiet in dev to avoid console spam
      console.debug('WebSocket error:', error);
    };

    ws.current = socket;

    return () => {
      try {
        if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
          socket.close();
        }
      } catch {}
    };
  }, [url, WS_ENABLED, WS_BASE]);

  const sendMessage = (message: WebSocketMessage) => {
    if (!WS_ENABLED) return;
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { lastMessage, isConnected, sendMessage };
}