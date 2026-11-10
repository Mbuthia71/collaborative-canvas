# Collaborative Canvas

A real-time collaborative canvas editor built with CRDTs (Conflict-free Replicated Data Types), Next.js, Supabase, and Konva.js.

## Features

- **Real-time collaboration** - Multiple users can edit the same canvas simultaneously
- **CRDT-based sync** - Uses Yjs for conflict-free data replication
- **Canvas editor** - Add rectangles, circles, and text
- **Drag, resize, rotate** - Transform objects with the selection tool
- **Real-time presence** - See other users' cursors
- **Supabase backend** - Auth, database, and real-time sync

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript, TailwindCSS
- **Canvas**: Konva.js, react-konva
- **CRDT**: Yjs, y-websocket
- **Backend**: Supabase (PostgreSQL, Realtime, Auth)
- **Real-time**: Supabase Realtime for presence tracking

## Getting Started

### Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from Supabase settings

### Setup

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Run the database schema in Supabase SQL Editor:
- Open your Supabase project
- Go to SQL Editor
- Copy and run the SQL from `supabase/schema.sql`

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

## Usage

1. Enter a canvas ID to join or create a canvas
2. Use the toolbar to select tools (Select, Rectangle, Circle, Text)
3. Click on the canvas to add shapes
4. Select objects to drag, resize, or rotate them
5. Press Delete or Backspace to remove selected objects
6. Share the canvas ID with others to collaborate in real-time

## Database Schema

The project uses three main tables:
- `canvases` - Stores canvas metadata
- `canvas_objects` - Stores individual canvas elements
- `user_presence` - Tracks real-time user presence and cursors

## Architecture

### CRDT Integration
- Yjs manages the collaborative state
- Changes are automatically synced between clients
- No central server needed for conflict resolution

### Real-time Sync
- Supabase Realtime handles WebSocket connections
- User presence is tracked in real-time
- Cursor positions are broadcast to all users

### Canvas Rendering
- Konva.js provides high-performance 2D canvas rendering
- React-konva integrates Konva with React
- Transformer component enables object manipulation

## Future Enhancements

- [ ] WebSocket server for Yjs sync (currently using local CRDT)
- [ ] Image upload support
- [ ] Layer management
- [ ] Undo/redo functionality
- [ ] Export to PNG/SVG
- [ ] User authentication with Supabase Auth
- [ ] Canvas permissions and sharing
- [ ] Version history with event sourcing

## License

MIT
