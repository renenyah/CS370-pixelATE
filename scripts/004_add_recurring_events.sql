-- Add recurring event fields to assignments table
ALTER TABLE assignments
ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE,
ADD COLUMN recurrence_days TEXT, -- Comma-separated days: 'monday,wednesday,friday'
ADD COLUMN recurrence_end_date DATE;

-- Add index for querying recurring events
CREATE INDEX idx_assignments_recurring ON assignments(is_recurring, recurrence_end_date);
