# GitHub-like Features for Collaborative Canvas

This implementation adds GitHub-like change tracking, user attribution, and presence features to the collaborative canvas.

## Features

### 1. User Attribution
Every object now tracks:
- **createdBy**: The user who created the object
- **createdByColor**: The user's color for visual identification
- **createdAt**: Timestamp when the object was created
- **updatedAt**: Timestamp when the object was last modified

### 2. Activity Feed (Change History)
A GitHub-style activity feed that shows:
- Who made changes
- What action was performed (create, update, delete)
- What type of object was changed (marker, circle, polygon)
- When the change occurred (relative timestamps like "2m ago")
- Visual indicators with user colors

**Access**: Click the "📜 Activity" button in the top-right corner of the map.

### 3. Real-time Presence
Shows all users currently active on the same canvas:
- User avatars with their assigned colors
- User names
- Last seen timestamps
- "Active now" indicator for recently active users
- "(you)" label for the current user

**Location**: Top-right corner of the map, always visible.

### 4. Object Attribution in Popups
When you click on any object (marker, circle, polygon), the popup now shows:
- Who created the object (with their color)
- When it was created (formatted timestamp)

## Setup Instructions

### 1. Run the Supabase Migration

Run the SQL migration in your Supabase dashboard to create the necessary tables:

```sql
-- File: supabase/migrations/20240111_add_change_history.sql
```

This creates:
- `change_history` table for tracking all changes
- `user_presence` table for real-time presence
- Proper indexes and RLS policies

### 2. Environment Variables

Ensure your `.env.local` has:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Testing the Features

1. **Open multiple browser tabs** with the same canvas ID
2. **Create objects** in one tab - they appear in the activity feed
3. **See other users** in the presence indicator
4. **Click objects** to see who created them and when

## How It Works

### Change History Flow
1. When a user creates/updates/deletes an object:
   - The CRDT (Yjs) syncs the change across all clients
   - The ChangeHistoryTracker logs the action to Supabase
   - The Activity Feed component polls for new changes every 10 seconds

### Presence Flow
1. Users connect via Supabase Realtime
2. Presence is updated every 5 seconds
3. Custom events notify the UI of changes
4. The presence indicator shows all active users

### Attribution Flow
1. When creating objects, `addObject()` receives userId and userColor
2. These are stored in the CanvasObject
3. Popups display this information when clicked

## API Reference

### ChangeHistoryTracker
```typescript
const tracker = new ChangeHistoryTracker(canvasId, userId, userName, userColor)

// Log a change
await tracker.logChange(objectId, 'create', 'marker', objectData)

// Get history for canvas
const history = await tracker.getHistory(50)

// Get history for specific object
const objHistory = await tracker.getObjectHistory(objectId)
```

### RealtimeSync
```typescript
const realtime = new RealtimeSync(canvasId, userId, userName, userColor)

// Connect to presence channel
await realtime.connect()

// Update cursor position
await realtime.updatePresence(cursorX, cursorY)

// Get current users
const users = await realtime.getCurrentUsers()

// Disconnect
realtime.disconnect()
```

## Future Enhancements

Potential additions:
- [ ] Diff view for object changes
- [ ] Revert/undo functionality
- [ ] Branching/merging support
- [ ] Commit messages for changes
- [ ] User profiles and avatars
- [ ] Filtering activity feed by user or action
- [ ] Export change history as CSV/JSON
