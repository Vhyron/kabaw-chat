// Message types that match your Go server
export interface Message {
  type: 'message' | 'system' | 'user_connected';
  username: string;
  user_id?: string;
  content: string;
  timestamp: string;
  channel?: string;
}

export interface OutgoingMessage {
  type: 'message';
  content: string;
}

export const ConnectionStatus = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
} as const;

export type ConnectionStatus = typeof ConnectionStatus[keyof typeof ConnectionStatus];