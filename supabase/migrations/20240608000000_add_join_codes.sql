-- Add join code functionality to handbooks
-- This allows admins to generate codes that new users can use to join handbooks

-- 1. Add join_code column to handbooks table
ALTER TABLE handbooks ADD COLUMN IF NOT EXISTS join_code TEXT UNIQUE;
ALTER TABLE handbooks ADD COLUMN IF NOT EXISTS join_code_expires_at TIMESTAMPTZ;
ALTER TABLE handbooks ADD COLUMN IF NOT EXISTS join_code_active BOOLEAN DEFAULT false;

-- 2. Create index for fast join code lookups
CREATE INDEX IF NOT EXISTS handbooks_join_code_idx ON handbooks(join_code) WHERE join_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS handbooks_join_code_active_idx ON handbooks(join_code_active) WHERE join_code_active = true;

-- 3. Add RLS policy for join codes
-- Allow anyone to read handbooks with active join codes (for verification during signup)
CREATE POLICY "Anyone can verify active join codes" 
ON handbooks FOR SELECT 
USING (
  join_code_active = true 
  AND join_code IS NOT NULL 
  AND (join_code_expires_at IS NULL OR join_code_expires_at > NOW())
);

-- 4. Create function to generate join codes
CREATE OR REPLACE FUNCTION generate_join_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  new_code TEXT;
  is_unique BOOLEAN := false;
BEGIN
  -- Generate codes in format: ABC-123-XYZ
  WHILE NOT is_unique LOOP
    new_code := 
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      '-' ||
      floor(100 + random() * 900)::text ||
      '-' ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int) ||
      chr(65 + floor(random() * 26)::int);
    
    -- Check if code is unique
    SELECT NOT EXISTS (
      SELECT 1 FROM handbooks WHERE join_code = new_code
    ) INTO is_unique;
  END LOOP;
  
  RETURN new_code;
END;
$$;

-- 5. Create function to create/update join code for a handbook
CREATE OR REPLACE FUNCTION create_handbook_join_code(
  handbook_id UUID,
  user_id UUID,
  expires_in_days INTEGER DEFAULT 30
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  expires_at TIMESTAMPTZ;
BEGIN
  -- Verify user is admin of this handbook
  IF NOT EXISTS (
    SELECT 1 FROM handbook_members 
    WHERE handbook_members.handbook_id = create_handbook_join_code.handbook_id 
    AND handbook_members.user_id = create_handbook_join_code.user_id 
    AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only handbook admins can create join codes';
  END IF;
  
  -- Generate new code
  new_code := generate_join_code();
  
  -- Calculate expiry date
  expires_at := NOW() + (expires_in_days || ' days')::INTERVAL;
  
  -- Update handbook with new join code
  UPDATE handbooks 
  SET 
    join_code = new_code,
    join_code_expires_at = expires_at,
    join_code_active = true,
    updated_at = NOW()
  WHERE id = handbook_id;
  
  RETURN new_code;
END;
$$;

-- 6. Create function to join handbook with code
CREATE OR REPLACE FUNCTION join_handbook_with_code(
  join_code TEXT,
  user_id UUID,
  user_role TEXT DEFAULT 'viewer'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  handbook_record RECORD;
  result JSON;
BEGIN
  -- Find handbook with valid join code
  SELECT id, title, slug, join_code_expires_at
  INTO handbook_record
  FROM handbooks
  WHERE handbooks.join_code = join_handbook_with_code.join_code
    AND join_code_active = true
    AND (join_code_expires_at IS NULL OR join_code_expires_at > NOW());
  
  IF handbook_record.id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid or expired join code'
    );
  END IF;
  
  -- Check if user is already a member
  IF EXISTS (
    SELECT 1 FROM handbook_members 
    WHERE handbook_id = handbook_record.id 
    AND handbook_members.user_id = join_handbook_with_code.user_id
  ) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'You are already a member of this handbook'
    );
  END IF;
  
  -- Add user as member
  INSERT INTO handbook_members (handbook_id, user_id, role, created_at)
  VALUES (handbook_record.id, user_id, user_role, NOW());
  
  -- Create notification preferences for the new member
  INSERT INTO user_notification_preferences (
    user_id, 
    handbook_id,
    email_new_topics,
    email_new_replies,
    email_mentions,
    app_new_topics,
    app_new_replies,
    app_mentions
  ) VALUES (
    user_id,
    handbook_record.id,
    true, true, true, true, true, true
  );
  
  RETURN json_build_object(
    'success', true,
    'handbook_id', handbook_record.id,
    'handbook_title', handbook_record.title,
    'handbook_slug', handbook_record.slug
  );
END;
$$;

-- 7. Add comments
COMMENT ON COLUMN handbooks.join_code IS 'Unique code that allows new users to join this handbook';
COMMENT ON COLUMN handbooks.join_code_expires_at IS 'When the join code expires (NULL = never expires)';
COMMENT ON COLUMN handbooks.join_code_active IS 'Whether the join code is currently active';
COMMENT ON FUNCTION generate_join_code() IS 'Generates a unique join code in format ABC-123-XYZ';
COMMENT ON FUNCTION create_handbook_join_code(UUID, UUID, INTEGER) IS 'Creates or updates a join code for a handbook (admin only)';
COMMENT ON FUNCTION join_handbook_with_code(TEXT, UUID, TEXT) IS 'Allows a user to join a handbook using a valid join code'; 