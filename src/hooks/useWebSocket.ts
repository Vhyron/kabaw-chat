import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message, OutgoingMessage } from '../types/message';
import { ConnectionStatus } from '../types/message';

interface UseWebSocketProps {
  username: string;
  channel: string;
  onMessage: (message: Message) => void;
}

export const useWebSocket = ({ username, channel, onMessage }: UseWebSocketProps) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [userId, setUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    setStatus(ConnectionStatus.CONNECTING);
    
    // Connect to WebSocket server
    const wsUrl = `ws://localhost:8080/ws?username=${encodeURIComponent(username)}&channel=${encodeURIComponent(channel)}`;
    console.log('[WebSocket] Connecting to:', wsUrl);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WebSocket] Connected successfully');
      setStatus(ConnectionStatus.CONNECTED);
    };

    ws.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        console.log('[WebSocket] Message received:', message);

        // If this is a user_connected message, extract the user ID
        if (message.type === 'user_connected' && message.user_id) {
          setUserId(message.user_id);
          console.log('[WebSocket] User ID assigned:', message.user_id);
        }

        onMessage(message);
      } catch (error) {
        console.error('[WebSocket] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[WebSocket] Error:', error);
      setStatus(ConnectionStatus.ERROR);
    };

    ws.onclose = (event) => {
      console.log('[WebSocket] Connection closed:', event.code, event.reason);
      setStatus(ConnectionStatus.DISCONNECTED);
      setUserId(null);
      wsRef.current = null;

      // Auto-reconnect after 3 seconds (optional)
      // reconnectTimeoutRef.current = setTimeout(() => {
      //   console.log('[WebSocket] Attempting to reconnect...');
      //   connect();
      // }, 3000);
    };
  }, [username, channel, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      console.log('[WebSocket] Disconnecting...');
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus(ConnectionStatus.DISCONNECTED);
    setUserId(null);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: OutgoingMessage = {
        type: 'message',
        content,
      };

      console.log('[WebSocket] Sending message:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    status,
    userId,
    isConnected: status === ConnectionStatus.CONNECTED,
  };
};