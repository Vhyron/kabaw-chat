import { useEffect, useRef, useState, useCallback } from 'react';
import type { Message, OutgoingMessage } from '../types/message';
import { ConnectionStatus } from '../types/message';

interface UseWebSocketProps {
  username: string;
  channel: string;
  onMessage: (message: Message) => void;
}

// Auto-reconnect configuration
const MAX_RETRIES = 5;
const RECONNECT_DELAY = 3000; // 3 seconds
const MIN_CONNECTING_DISPLAY_TIME = 800; // Minimum time to show "Connecting..." state (800ms)

export const useWebSocket = ({ username, channel, onMessage }: UseWebSocketProps) => {
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.DISCONNECTED);
  const [userId, setUserId] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [shouldReload, setShouldReload] = useState(false);
  const [reloadCountdown, setReloadCountdown] = useState(5);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reloadTimeoutRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);
  const intentionalCloseRef = useRef(false);
  const retryCountRef = useRef(0);
  const previousUserIdRef = useRef<string | null>(null);
  const connectingStartTimeRef = useRef<number>(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[FRONTEND] WebSocket already connected');
      return;
    }

    // Track when we started connecting
    connectingStartTimeRef.current = Date.now();
    setStatus(ConnectionStatus.CONNECTING);
    
    // Connect to WebSocket server
    const wsUrl = `ws://localhost:8080/ws?username=${encodeURIComponent(username)}&channel=${encodeURIComponent(channel)}`;
    console.log(`[FRONTEND-CONNECT] Attempting to connect to: ${wsUrl}`);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log(`[FRONTEND-CONNECT] Connected to WebSocket as ${username} in channel ${channel}`);
      
      // Calculate how long we've been in "connecting" state
      const elapsedTime = Date.now() - connectingStartTimeRef.current;
      const remainingTime = Math.max(0, MIN_CONNECTING_DISPLAY_TIME - elapsedTime);
      
      // Ensure the "Connecting..." state is visible for at least MIN_CONNECTING_DISPLAY_TIME
      setTimeout(() => {
        setStatus(ConnectionStatus.CONNECTED);
        setIsReconnecting(false);
        retryCountRef.current = 0; // Reset retry count on successful connection
      }, remainingTime);
    };

    ws.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        console.log('[FRONTEND-MESSAGE]', message);

        // If this is a user_connected message, extract the user ID
        if (message.type === 'user_connected' && message.user_id) {
          previousUserIdRef.current = message.user_id;
          setUserId(message.user_id);
          console.log(`[FRONTEND-USER-ID] Assigned user ID: ${message.user_id}`);
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
      
      // Calculate elapsed time to ensure minimum display
      const elapsedTime = Date.now() - connectingStartTimeRef.current;
      const remainingTime = Math.max(0, MIN_CONNECTING_DISPLAY_TIME - elapsedTime);
      
      // Delay state update to ensure smooth transition
      setTimeout(() => {
        setStatus(ConnectionStatus.DISCONNECTED);
      }, remainingTime);
      
      wsRef.current = null;
      
      // Auto-reconnect logic
      const shouldReconnect = 
        !intentionalCloseRef.current && 
        event.code !== 1000 && 
        retryCountRef.current < MAX_RETRIES;
      
      if (shouldReconnect) {
        retryCountRef.current += 1;
        setIsReconnecting(true);
        console.log(`[FRONTEND-CONNECT] Attempting to reconnect... (${retryCountRef.current}/${MAX_RETRIES})`);
        console.log(`[FRONTEND-USER-ID] Keeping user ID during reconnection: ${previousUserIdRef.current}`);
        
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, RECONNECT_DELAY);
      } else {
        setIsReconnecting(false);
        
        // Only clear user ID if we've exhausted retries OR it was intentional disconnect
        if (retryCountRef.current >= MAX_RETRIES) {
          console.error('[FRONTEND-ERROR] Max reconnection attempts reached. Reloading page in 3 seconds...');
          console.log('[FRONTEND-USER-ID] User ID cleared after max retries');
          setUserId(null);
          previousUserIdRef.current = null;
          retryCountRef.current = 0;
          
          // Trigger reload sequence
          setShouldReload(true);
          setReloadCountdown(3);
          
          // Start countdown
          countdownIntervalRef.current = window.setInterval(() => {
            setReloadCountdown((prev) => {
              if (prev <= 1) {
                // Countdown finished, reload the page
                if (countdownIntervalRef.current) {
                  clearInterval(countdownIntervalRef.current);
                }
                window.location.reload();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          
        } else if (intentionalCloseRef.current) {
          console.log('[FRONTEND-USER-ID] User ID cleared');
          setUserId(null);
          previousUserIdRef.current = null;
        }
      }
    };
  }, [username, channel, onMessage]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
    }

    if (wsRef.current) {
      console.log('[FRONTEND-DISCONNECT] User initiated disconnect');
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }

    setStatus(ConnectionStatus.DISCONNECTED);
    setIsReconnecting(false);
    setShouldReload(false);
    setUserId(null);
    previousUserIdRef.current = null;
  }, []);

  const cancelReload = useCallback(() => {
    console.log('[FRONTEND-RELOAD] User cancelled auto-reload');
    
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    
    setShouldReload(false);
    setReloadCountdown(3);
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
      intentionalCloseRef.current = true;
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    sendMessage,
    cancelReload,
    status,
    userId,
    isConnected: status === ConnectionStatus.CONNECTED,
    isReconnecting,
    retryCount: retryCountRef.current,
    shouldReload,
    reloadCountdown,
  };
};