import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message, OutgoingMessage } from '../types/message';
import { ConnectionStatus } from '../types/message';

interface UseWebSocketProps {
  username: string;
  channel: string;
  onMessage: (message: Message) => void;
}

const MAX_RETRIES = 5;
const RECONNECT_DELAY = 3000; // 3 seconds

export const useWebSocket = ({ username, channel, onMessage }: UseWebSocketProps) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [userId, setUserId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const intentionalCloseRef = useRef(false);
  const retryCountRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[FRONTEND] WebSocket already connected');
      return;
    }

    setStatus(ConnectionStatus.CONNECTING);
    
    // Connect to WebSocket server
    const wsUrl = `ws://localhost:8080/ws?username=${encodeURIComponent(username)}&channel=${encodeURIComponent(channel)}`;
    console.log(`[FRONTEND-CONNECT] Attempting to connect to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[FRONTEND-CONNECT] Connected to WebSocket as ${username} in channel ${channel}`);
      setStatus(ConnectionStatus.CONNECTED);
      retryCountRef.current = 0; // Reset retry count on successful connection
    };

    ws.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        console.log('[FRONTEND-MESSAGE]', message);

        // If this is a user_connected message, extract the user ID
        if (message.type === 'user_connected' && message.user_id) {
          setUserId(message.user_id);
        }

        onMessage(message);
      } catch (error) {
        console.error('[FRONTEND-ERROR] Failed to parse message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[FRONTEND-ERROR] WebSocket error:', error);
      setStatus(ConnectionStatus.ERROR);
    };

    ws.onclose = (event) => {
      console.log(`[FRONTEND-DISCONNECT] Connection closed. Code: ${event.code}, Reason: ${event.reason || 'No reason provided'}`);
      setStatus(ConnectionStatus.DISCONNECTED);
      setUserId(null);
      wsRef.current = null;
      
      // Smart auto-reconnect logic
      // Only reconnect if:
      // 1. Connection wasn't closed intentionally by user
      // 2. Connection wasn't closed normally (code 1000)
      // 3. Haven't exceeded max retry attempts
      const shouldReconnect = 
        !intentionalCloseRef.current && 
        event.code !== 1000 && 
        retryCountRef.current < MAX_RETRIES;
      
      if (shouldReconnect) {
        retryCountRef.current += 1;
        console.log(`[FRONTEND-CONNECT] Attempting to reconnect... (${retryCountRef.current}/${MAX_RETRIES})`);
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      } else if (retryCountRef.current >= MAX_RETRIES) {
        console.error('[FRONTEND-ERROR] Max reconnection attempts reached. Please refresh the page or click Connect.');
        retryCountRef.current = 0; // Reset for future manual connection attempts
      }
    };
  }, [username, channel, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      console.log('[FRONTEND-DISCONNECT] User initiated disconnect');
      intentionalCloseRef.current = true; // Mark as intentional close
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

      console.log('[FRONTEND-SEND]', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.warn('[FRONTEND-ERROR] Cannot send message: not connected');
      return false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true; // Treat unmount as intentional close
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