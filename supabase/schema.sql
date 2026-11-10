-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Canvases table
CREATE TABLE canvases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Canvas objects table (stores individual shapes/elements)
CREATE TABLE canvas_objects (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
  object_type TEXT NOT NULL, -- 'rect', 'circle', 'text', 'image', etc.
  properties JSONB NOT NULL, -- x, y, width, height, rotation, fill, stroke, etc.
  z_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User presence table (for real-time cursors)
CREATE TABLE user_presence (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  canvas_id UUID REFERENCES canvases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_x FLOAT,
  cursor_y FLOAT,
  user_name TEXT,
  user_color TEXT,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(canvas_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE canvases ENABLE ROW LEVEL SECURITY;
ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for canvases
CREATE POLICY "Anyone can view canvases" ON canvases FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create canvases" ON canvases FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update canvases" ON canvases FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete canvases" ON canvases FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for canvas_objects
CREATE POLICY "Anyone can view canvas objects" ON canvas_objects FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create objects" ON canvas_objects FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_objects.canvas_id AND canvases.owner_id = auth.uid())
);
CREATE POLICY "Owners can update objects" ON canvas_objects FOR UPDATE USING (
  EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_objects.canvas_id AND canvases.owner_id = auth.uid())
);
CREATE POLICY "Owners can delete objects" ON canvas_objects FOR DELETE USING (
  EXISTS (SELECT 1 FROM canvases WHERE canvases.id = canvas_objects.canvas_id AND canvases.owner_id = auth.uid())
);

-- RLS Policies for user_presence
CREATE POLICY "Anyone can view presence" ON user_presence FOR SELECT USING (true);
CREATE POLICY "Authenticated users can update presence" ON user_presence FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own presence" ON user_presence FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own presence" ON user_presence FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_canvas_objects_canvas_id ON canvas_objects(canvas_id);
CREATE INDEX idx_user_presence_canvas_id ON user_presence(canvas_id);
CREATE INDEX idx_user_presence_user_id ON user_presence(user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_canvases_updated_at BEFORE UPDATE ON canvases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_canvas_objects_updated_at BEFORE UPDATE ON canvas_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
