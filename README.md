# Kabaw Chat - React WebSocket Client

A modern, real-time chat application built with React and TypeScript, connecting to the [Kabaw WebSocket Server](https://github.com/kabaw-ai/kabaw-sockets).

## Features

- 🚀 Real-time messaging via WebSockets
- 🎨 Modern dark theme with Kabaw brand colors
- 💬 Message bubbles with user avatars
- 🔄 Auto-reconnection on connection loss
- 📱 Responsive design
- 🎯 TypeScript for type safety

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- [Kabaw WebSocket Server](https://github.com/kabaw-ai/kabaw-sockets) running on `localhost:8080`

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### 3. Connect to Chat

1. Make sure the [Kabaw WebSocket Server](https://github.com/kabaw-ai/kabaw-sockets) is running on port 8080
2. Enter your username and channel name
3. Click "Connect to Chat"
4. Start messaging!

## Project Structure

```
kabaw-chat/
├── src/
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # App entry point
│   ├── hooks/
│   │   └── useWebSocket.ts  # WebSocket connection logic
│   ├── types/
│   │   └── message.ts       # TypeScript type definitions
│   └── styles/
│       └── App.css          # Application styles
├── public/
│   └── logo.png             # Kabaw logo
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## WebSocket Server

This client connects to the Kabaw WebSocket Server. To run the server:

```bash
git clone https://github.com/kabaw-ai/kabaw-sockets.git
cd kabaw-sockets
go mod tidy
go run main.go
```

Server will start on `ws://localhost:8080/ws`

## Technology Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool with SWC
- **WebSocket API** - Real-time communication

## Configuration

Default WebSocket URL: `ws://localhost:8080/ws`

To change the server URL, edit `src/hooks/useWebSocket.ts`:

```typescript
const wsUrl = `ws://your-server:port/ws?username=${username}&channel=${channel}`;
```

## Features in Detail

### Auto-Reconnection
- Automatically reconnects if connection drops
- Maximum 5 retry attempts
- 3-second delay between retries

### Message Types
- **Regular messages** - User chat messages
- **System messages** - Connection notifications
- **User connected** - New user joins with unique ID

### User Experience
- Smooth animations for messages
- Color-coded user avatars
- Timestamp display
- Message input with Enter key support
- Connection status indicator

## License

MIT

## Related Projects

- [Kabaw WebSocket Server](https://github.com/kabaw-ai/kabaw-sockets) - Go WebSocket server

---

Built with ❤️ for real-time communication