-- Add attachments table for storing uploaded files metadata
CREATE TABLE IF NOT EXISTS attachments (
  id SERIAL PRIMARY KEY,
  journey_id INTEGER REFERENCES journeys(id) ON DELETE CASCADE,
  stop_id INTEGER REFERENCES stops(id) ON DELETE CASCADE,
  transport_id INTEGER REFERENCES transports(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_encrypted BOOLEAN DEFAULT true,
  iv TEXT,
  auth_tag TEXT,
  parsed_json JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Optional index for faster lookup by journey
CREATE INDEX IF NOT EXISTS idx_attachments_journey_id ON attachments (journey_id);