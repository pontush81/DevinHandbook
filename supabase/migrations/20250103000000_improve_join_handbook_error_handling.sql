-- Improve join_handbook_with_code function to handle duplicate errors gracefully
-- This fixes the issues seen in logs where users get constraint violations

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
  existing_member RECORD;
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
  
  -- Check if user is already a member and get their current role
  SELECT role INTO existing_member
  FROM handbook_members 
  WHERE handbook_id = handbook_record.id 
  AND handbook_members.user_id = join_handbook_with_code.user_id;
  
  IF existing_member.role IS NOT NULL THEN
    -- User is already a member - return success with appropriate message
    RETURN json_build_object(
      'success', true,
      'handbook_id', handbook_record.id,
      'handbook_title', handbook_record.title,
      'handbook_slug', handbook_record.slug,
      'message', 'Du är redan medlem i denna handbok',
      'current_role', existing_member.role,
      'already_member', true
    );
  END IF;
  
  -- Add user as member (use INSERT with ON CONFLICT to handle race conditions)
  INSERT INTO handbook_members (handbook_id, user_id, role, created_at)
  VALUES (handbook_record.id, user_id, user_role, NOW())
  ON CONFLICT (handbook_id, user_id) DO NOTHING;
  
  -- Create notification preferences for the new member (handle duplicates gracefully)
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
  ) ON CONFLICT (user_id, handbook_id) DO NOTHING;
  
  RETURN json_build_object(
    'success', true,
    'handbook_id', handbook_record.id,
    'handbook_title', handbook_record.title,
    'handbook_slug', handbook_record.slug,
    'message', 'Välkommen till handboken!',
    'role', user_role,
    'already_member', false
  );
END;
$$;

-- Add comment
COMMENT ON FUNCTION join_handbook_with_code(TEXT, UUID, TEXT) IS 'Allows a user to join a handbook using a valid join code with improved duplicate handling'; 