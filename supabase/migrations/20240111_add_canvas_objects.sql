-- Drop table if it exists to ensure clean state
DROP TABLE IF EXISTS canvas_objects CASCADE;

-- Table for storing canvas objects with real-time sync
CREATE TABLE canvas_objects (
  id TEXT PRIMARY KEY,
  canvas_id TEXT NOT NULL,
  object_type TEXT NOT NULL, -- 'marker', 'polygon', 'circle', 'rect', 'text', 'image'
  x INTEGER NOT NULL DEFAULT 0,
  y INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  rotation NUMERIC,
  fill TEXT,
  stroke TEXT,
  stroke_width INTEGER,
  text TEXT,
  font_size INTEGER,
  z_index INTEGER,
  -- Geospatial properties
  lat NUMERIC,
  lng NUMERIC,
  radius INTEGER,
  positions JSONB, -- Array of [lat, lng] for polygons
  -- User attribution
  created_by TEXT NOT NULL,
  created_by_color TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX idx_canvas_objects_canvas_id ON canvas_objects(canvas_id);
CREATE INDEX idx_canvas_objects_object_type ON canvas_objects(object_type);
CREATE INDEX idx_canvas_objects_created_by ON canvas_objects(created_by);
CREATE INDEX idx_canvas_objects_updated_at ON canvas_objects(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE canvas_objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view canvas objects for a canvas" ON canvas_objects;
DROP POLICY IF EXISTS "Anyone can insert canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Anyone can update canvas objects" ON canvas_objects;
DROP POLICY IF EXISTS "Anyone can delete canvas objects" ON canvas_objects;

-- Policies for canvas_objects
CREATE POLICY "Anyone can view canvas objects for a canvas"
  ON canvas_objects FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert canvas objects"
  ON canvas_objects FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update canvas objects"
  ON canvas_objects FOR UPDATE
  USING (true);

CREATE POLICY "Anyone can delete canvas objects"
  ON canvas_objects FOR DELETE
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_canvas_objects_updated_at ON canvas_objects;
CREATE TRIGGER update_canvas_objects_updated_at
  BEFORE UPDATE ON canvas_objects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();