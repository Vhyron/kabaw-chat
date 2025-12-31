import { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import type { Message } from './types/message';
import './styles/App.css';

// Generate a colorful avatar based on username using Kabaw color palette
const getAvatarColor = (username: string): string => {
  const colors = [
    'hsl(var(--kabaw-green))',
    'hsl(var(--kabaw-green-light))',
    'hsl(var(--kabaw-accent-1))',
    'hsl(var(--kabaw-accent-2))',
    'hsl(var(--kabaw-blue))',
    'hsl(var(--kabaw-purple))',
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
          <div className="header-left">
            <div className="logo">
              <img src="/logo.png" alt="Kabaw" />
            </div>
            {isConnected && (
              <div className="channel-badge">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
                  <line x1="4" y1="22" x2="4" y2="15"></line>
                </svg>
                {channel}
              </div>
            )}
          </div>
          <div className="header-right">
            <div className="connection-status">
              <span className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
              <span className="status-text">
                {isConnected ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
              </span>
            </div>
            {isConnected && (
              <button 
                onClick={handleDisconnect}
                className="disconnect-button"
                aria-label="Disconnect"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span>Disconnect</span>
              </button>
            )}
          </div>
        </div>

        {/* Connection Form (shown when disconnected) */}
        {!isConnected && (
          <div className="connection-form">
            <div className="form-content">
              <div className="form-header">
                <div className="form-logo">
                  <img src="/logo.png" alt="Kabaw" />
                </div>
                <h3>Welcome to Kabaw Chat</h3>
                <p className="form-description">Connect to start chatting with your team</p>
              </div>
              <div className="form-fields">
                <div className="input-group">
                  <label htmlFor="username">Username</label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                    disabled={status === 'connecting'}
                    autoFocus
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="channel">Channel</label>
                  <input
                    id="channel"
                    type="text"
                    placeholder="general"
                    value={channel}
                    onChange={(e) => setChannel(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
                    disabled={status === 'connecting'}
                  />
                </div>
                <button 
                  onClick={handleConnect}
                  disabled={!username.trim() || status === 'connecting'}
                  className="connect-button"
                >
                  {status === 'connecting' ? (
                    <>
                      <span className="spinner"></span>
                      Connecting...
                    </>
                  ) : (
                    'Connect to Chat'
                  )}
                </button>
                {status === 'error' && (
                  <div className="error-message">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="12" y1="8" x2="12" y2="12"></line>
                      <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    Connection failed. Make sure the server is running on port 8080.
                  </div>
                )}
              </div>
              <div className="server-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                  <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                  <line x1="6" y1="6" x2="6.01" y2="6"></line>
                  <line x1="6" y1="18" x2="6.01" y2="18"></line>
                </svg>
                <code>ws://localhost:8080/ws</code>
              </div>
            </div>
          </div>
        )}

        {/* Chat Messages (shown when connected) */}
        {isConnected && (
          <>
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-state">
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                  <p>No messages yet</p>
                  <span>Start the conversation!</span>
                </div>
              ) : (
                <>
                  {messages.map((msg, index) => (
                    <div key={`${msg.username}-${msg.timestamp}-${index}`} className={getMessageClassName(msg)}>
                      {msg.type === 'system' || msg.type === 'user_connected' ? (
                        <div className="system-message-content">
                          <span>{msg.content}</span>
                          {msg.user_id && userId === msg.user_id && (
                            <span className="user-id-badge">
                              ID: {msg.user_id.slice(0, 8)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="message-wrapper">
                          <div
                            className="message-avatar"
                            style={{ background: getAvatarColor(msg.username) }}
                          >
                            {getInitials(msg.username)}
                          </div>
                          <div className="message-content">
                            <div className="message-header">
                              <span className="message-author">{msg.username}</span>
                              {msg.timestamp && (
                                <span className="message-time">{formatTimestamp(msg.timestamp)}</span>
                              )}
                            </div>
                            <div className="message-text">{msg.content}</div>
                          </div>
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
              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="message-input"
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={!messageInput.trim()}
                  className="send-button"
                  aria-label="Send message"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;