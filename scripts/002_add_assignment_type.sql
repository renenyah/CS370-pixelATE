-- Add assignment_type column to assignments table
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS assignment_type TEXT DEFAULT 'assignment';

-- Create index on assignment_type for filtering
CREATE INDEX IF NOT EXISTS idx_assignments_type ON assignments(assignment_type);
