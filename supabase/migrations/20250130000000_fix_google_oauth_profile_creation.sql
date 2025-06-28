-- Fix Google OAuth profile creation and improve join_handbook_with_code
-- This migration ensures profiles are created before attempting to join handbooks

-- 1. Create a secure function to ensure user profile exists
CREATE OR REPLACE FUNCTION ensure_user_profile_exists(
  target_user_id UUID,
  user_email TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert profile if it doesn't exist
  INSERT INTO profiles (id, email, created_at, is_superadmin)
  VALUES (
    target_user_id,
    user_email,
    NOW(),
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Return true if profile exists now
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = target_user_id);
END;
$$;

-- 2. Improve join_handbook_with_code to ensure profile exists before joining
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
  profile_exists BOOLEAN;
  user_email_from_auth TEXT;
  result JSON;
BEGIN
  -- Step 1: Ensure user profile exists
  -- First, try to get email from auth.users for profile creation
  SELECT email INTO user_email_from_auth 
  FROM auth.users 
  WHERE id = user_id;
  
  -- Ensure profile exists (this will create one if missing)
  SELECT ensure_user_profile_exists(user_id, user_email_from_auth) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- This should rarely happen, but handle gracefully
    RETURN json_build_object(
      'success', false,
      'error', 'Could not create user profile. Please contact support.'
    );
  END IF;
  
  -- Step 2: Find handbook with valid join code
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
  
  -- Step 3: Check if user is already a member and get their current role
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
  
  -- Step 4: Add user as member (use INSERT with ON CONFLICT to handle race conditions)
  INSERT INTO handbook_members (handbook_id, user_id, role, created_at)
  VALUES (handbook_record.id, user_id, user_role, NOW())
  ON CONFLICT (handbook_id, user_id) DO NOTHING;
  
  -- Step 5: Create notification preferences for the new member (handle duplicates gracefully)
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

-- 3. Improve the trigger for automatic profile creation on Google OAuth
-- This trigger ensures profiles are created immediately when users are created via any method
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get email from the new user record
  user_email := NEW.email;
  
  -- Create profile with error handling
  BEGIN
    INSERT INTO public.profiles (id, email, created_at, is_superadmin)
    VALUES (
      NEW.id,
      user_email,
      NOW(),
      FALSE
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      updated_at = NOW();
    
    -- Log successful profile creation
    RAISE LOG 'Profile created/updated for user: % (email: %)', NEW.id, user_email;
    
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE LOG 'Failed to create profile for user % (email: %): %', NEW.id, user_email, SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

-- 4. Add helpful comments
COMMENT ON FUNCTION ensure_user_profile_exists(UUID, TEXT) IS 'Ensures a user profile exists in the profiles table, creating one if necessary';
COMMENT ON FUNCTION join_handbook_with_code(TEXT, UUID, TEXT) IS 'Enhanced version that ensures user profile exists before joining handbook';
COMMENT ON FUNCTION public.handle_new_user_signup() IS 'Trigger function that creates profiles automatically for new users, including Google OAuth';

-- 5. Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION ensure_user_profile_exists(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION join_handbook_with_code(TEXT, UUID, TEXT) TO authenticated; 