-- Add icon column to sections table
-- This allows users to choose custom icons for their sections

ALTER TABLE sections 
ADD COLUMN icon TEXT;

-- Add comment to explain the column
COMMENT ON COLUMN sections.icon IS 'Name of the Lucide icon to display for this section (e.g., "Users", "Phone", "Heart")';

-- Create index for better performance when querying by icon
CREATE INDEX idx_sections_icon ON sections(icon) WHERE icon IS NOT NULL; 