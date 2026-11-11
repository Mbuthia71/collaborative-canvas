-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table for tracking change history (GitHub-like commit history)
CREATE TABLE IF NOT EXISTS change_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  object_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_color TEXT NOT NULL,
  action TEXT NOT NULL, -- 'create', 'update', 'delete'
  object_type TEXT NOT NULL, -- 'marker', 'polygon', 'circle', etc.
  changes JSONB, -- Store the actual changes made
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_change_history_canvas_id ON change_history(canvas_id);
CREATE INDEX IF NOT EXISTS idx_change_history_timestamp ON change_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_change_history_object_id ON change_history(object_id);

-- Table for user presence (already exists, but adding for completeness)
CREATE TABLE IF NOT EXISTS user_presence (
  canvas_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_color TEXT NOT NULL,
  cursor_x INTEGER DEFAULT 0,
  cursor_y INTEGER DEFAULT 0,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (canvas_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view change history for a canvas" ON change_history;
DROP POLICY IF EXISTS "Anyone can insert change history" ON change_history;
DROP POLICY IF EXISTS "Anyone can view user presence" ON user_presence;
DROP POLICY IF EXISTS "Anyone can insert user presence" ON user_presence;
DROP POLICY IF EXISTS "Anyone can update user presence" ON user_presence;
DROP POLICY IF EXISTS "Users can delete their own presence" ON user_presence;

-- Policies for change_history
CREATE POLICY "Anyone can view change history for a canvas"
  ON change_history FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert change history"
  ON change_history FOR INSERT
  WITH CHECK (true);

-- Policies for user_presence
CREATE POLICY "Anyone can view user presence"
  ON user_presence FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert user presence"
  ON user_presence FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update user presence"
  ON user_presence FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete their own presence"
  ON user_presence FOR DELETE
  USING (true);