-- Fix notification system for forum replies
-- This migration creates an RPC function to get user emails reliably

-- RPC function to get user emails by user IDs
-- This allows us to get email addresses from auth.users table
CREATE OR REPLACE FUNCTION get_user_emails_by_ids(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT) 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.email::TEXT
  FROM auth.users au
  WHERE au.id = ANY(user_ids)
    AND au.email IS NOT NULL
    AND au.email_confirmed_at IS NOT NULL;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_emails_by_ids(UUID[]) TO authenticated;

-- Ensure all handbook members have notification preferences
-- This function will create default preferences for members who don't have them
CREATE OR REPLACE FUNCTION ensure_notification_preferences()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO user_notification_preferences (
    user_id, 
    handbook_id,
    email_new_topics,
    email_new_replies,
    email_mentions,
    app_new_topics,
    app_new_replies,
    app_mentions
  )
  SELECT 
    hm.user_id,
    hm.handbook_id,
    true,  -- email_new_topics
    true,  -- email_new_replies
    true,  -- email_mentions
    true,  -- app_new_topics
    true,  -- app_new_replies
    true   -- app_mentions
  FROM handbook_members hm
  LEFT JOIN user_notification_preferences unp 
    ON hm.user_id = unp.user_id AND hm.handbook_id = unp.handbook_id
  WHERE unp.id IS NULL;
  
  RAISE NOTICE 'Notification preferences ensured for all handbook members';
END;
$$;

-- Run the function to ensure all existing members have notification preferences
SELECT ensure_notification_preferences();

-- Create a better trigger function for creating notification preferences
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
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
    NEW.user_id,
    NEW.handbook_id,
    true,  -- email_new_topics
    true,  -- email_new_replies
    true,  -- email_mentions
    true,  -- app_new_topics
    true,  -- app_new_replies
    true   -- app_mentions
  )
  ON CONFLICT (user_id, handbook_id) 
  DO UPDATE SET
    -- Update updated_at timestamp even if no changes
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update comment for documentation
COMMENT ON FUNCTION get_user_emails_by_ids(UUID[]) IS 'Get email addresses for given user IDs from auth.users table - used for notifications';
COMMENT ON FUNCTION ensure_notification_preferences() IS 'Ensure all handbook members have notification preferences with sensible defaults'; 