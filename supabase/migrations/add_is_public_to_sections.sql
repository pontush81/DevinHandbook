-- Add is_public column to sections table
-- This allows sections to be marked as public or private

ALTER TABLE sections 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT true;

-- Update existing sections to be public by default
UPDATE sections 
SET is_public = true 
WHERE is_public IS NULL; 