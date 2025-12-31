import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import type { Message } from './types/message';
import './styles/App.css';

// Generate a colorful avatar based on username
const getAvatarColor = (username: string): string => {
  const colors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', 
    '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
  ];
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (username: string): string => {
  return username
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

function App() {
  const [username, setUsername] = useState('');
  const [channel, setChannel] = useState('general');
  const [messageInput, setMessageInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [shouldConnect, setShouldConnect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle incoming messages
  const handleMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  // Initialize WebSocket
  const { connect, disconnect, sendMessage, status, userId, isConnected } = useWebSocket({
    username: username || 'Anonymous',
    channel,
    onMessage: handleMessage,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle connection
  useEffect(() => {
    if (shouldConnect && username.trim()) {
      connect();
    }
  }, [shouldConnect, username, connect]);

  const handleConnect = () => {
    if (username.trim()) {
      setShouldConnect(true);
    }
  };

  const handleDisconnect = () => {
    setShouldConnect(false);
    disconnect();
    setMessages([]);
  };

  const handleSendMessage = () => {
    if (messageInput.trim() && isConnected) {
      const success = sendMessage(messageInput.trim());
      if (success) {
        setMessageInput('');
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const getMessageClassName = (message: Message) => {
    if (message.type === 'system') return 'message message-system';
    if (message.type === 'user_connected') return 'message message-system';
    if (message.username === username) return 'message message-own';
    return 'message message-other';
  };

  return (
    <div className="app">
      <div className="chat-container">
        {/* Header */}
        <div className="chat-header">
          <h1>🐃 Kabaw Chat</h1>
          <div className="connection-status">
            <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
            <span>{isConnected ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}</span>
          </div>
        </div>

        {/* Connection Form (shown when disconnected) */}
        {!isConnected && (
          <div className="connection-form">
            <h3>Join the Chat</h3>
            <p>Server: ws://localhost:8080/ws</p>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
              disabled={status === 'connecting'}
            />
            <input
              type="text"
              placeholder="Channel (default: general)"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
              disabled={status === 'connecting'}
            />
            <button 
              onClick={handleConnect}
              disabled={!username.trim() || status === 'connecting'}
            >
              {status === 'connecting' ? 'Connecting...' : 'Connect'}
            </button>
            {status === 'error' && (
              <p style={{ color: '#ef4444', fontSize: '14px', marginTop: '10px', fontWeight: 600 }}>
                ⚠️ Connection failed. Make sure the server is running on port 8080.
              </p>
            )}
          </div>
        )}

        {/* Chat Messages (shown when connected) */}
        {isConnected && (
          <>
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <p>No messages yet. Start the conversation! 💬</p>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div key={`${msg.username}-${msg.timestamp}-${index}`} className={getMessageClassName(msg)}>
                      {msg.type === 'system' || msg.type === 'user_connected' ? (
                        <div className="message-content">
                          <em>{msg.content}</em>
                          {msg.user_id && userId === msg.user_id && (
                            <small style={{ display: 'block', marginTop: '6px', color: '#10b981', fontWeight: 600 }}>
                              ✓ Your ID: {msg.user_id.slice(0, 8)}...
                            </small>
                          )}
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', width: '100%' }}>
                          {msg.username !== username && (
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: getAvatarColor(msg.username),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                flexShrink: 0,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              }}
                            >
                              {getInitials(msg.username)}
                            </div>
                          )}
                          <div className="message-content" style={{ flex: 1 }}>
                            <div className="message-header">
                              <strong>{msg.username}</strong>
                              {msg.timestamp && (
                                <small className="message-time">{formatTimestamp(msg.timestamp)}</small>
                              )}
                            </div>
                            <div className="message-text">{msg.content}</div>
                          </div>
                          {msg.username === username && (
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: getAvatarColor(msg.username),
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                flexShrink: 0,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                              }}
                            >
                              {getInitials(msg.username)}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Message Input */}
            <div className="message-input-container">
              <input
                type="text"
                placeholder="Type your message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button 
                onClick={handleSendMessage}
                disabled={!messageInput.trim()}
              >
                Send
              </button>
              <button 
                onClick={handleDisconnect}
                style={{ background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' }}
              >
                Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;