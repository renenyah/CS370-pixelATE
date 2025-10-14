-- Add start_time and end_time columns for labs and class times
ALTER TABLE assignments
ADD COLUMN start_time TIME,
ADD COLUMN end_time TIME;
