-- Create assignments table for tracking homework and due dates
CREATE TABLE IF NOT EXISTS assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  course_name TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on due_date for faster queries
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);

-- Create index on completed status
CREATE INDEX IF NOT EXISTS idx_assignments_completed ON assignments(completed);

-- Enable Row Level Security (RLS)
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can add auth later)
CREATE POLICY "Allow all operations on assignments" ON assignments
  FOR ALL
  USING (true)
  WITH CHECK (true);
