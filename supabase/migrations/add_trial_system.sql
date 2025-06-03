-- Migration för att lägga till 30 dagars trial-system
-- Detta gör att nya användare får 30 dagar gratis när de skapar sin första handbok

-- Skapa tabell för att spåra användarprofiler och trial-status
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  email TEXT,
  full_name TEXT,
  -- Trial-relaterade fält
  trial_started_at TIMESTAMP WITH TIME ZONE,
  trial_ends_at TIMESTAMP WITH TIME ZONE,
  trial_used BOOLEAN DEFAULT FALSE,
  -- Prenumerationsstatus
  subscription_status TEXT DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'canceled', 'expired')),
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT UNIQUE,
  -- Metadata
  first_handbook_created_at TIMESTAMP WITH TIME ZONE,
  total_handbooks_created INTEGER DEFAULT 0
);

-- Skapa tabell för att spåra trial-aktiviteter
CREATE TABLE IF NOT EXISTS trial_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('trial_started', 'trial_extended', 'trial_ended', 'trial_converted')),
  description TEXT,
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Lägg till RLS policies
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trial_activities ENABLE ROW LEVEL SECURITY;

-- Policies för user_profiles
CREATE POLICY "Användare kan se sin egen profil" 
  ON user_profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Användare kan uppdatera sin egen profil" 
  ON user_profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Systemet kan skapa profiler" 
  ON user_profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Policies för trial_activities
CREATE POLICY "Användare kan se sina egna aktiviteter" 
  ON trial_activities FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Systemet kan skapa aktiviteter" 
  ON trial_activities FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Lägg till updated_at trigger för user_profiles
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Lägg till funktion för att starta trial
CREATE OR REPLACE FUNCTION start_user_trial(user_id UUID, user_email TEXT DEFAULT NULL)
RETURNS user_profiles AS $$
DECLARE
  trial_duration INTERVAL := '30 days';
  user_profile user_profiles;
BEGIN
  -- Kontrollera om profilen redan finns
  SELECT * INTO user_profile FROM user_profiles WHERE id = user_id;
  
  IF user_profile.id IS NULL THEN
    -- Skapa ny profil med trial
    INSERT INTO user_profiles (
      id, 
      email, 
      trial_started_at, 
      trial_ends_at, 
      trial_used,
      subscription_status
    ) VALUES (
      user_id,
      user_email,
      NOW(),
      NOW() + trial_duration,
      TRUE,
      'trial'
    ) RETURNING * INTO user_profile;
    
    -- Logga trial-start
    INSERT INTO trial_activities (user_id, activity_type, description)
    VALUES (user_id, 'trial_started', 'Användare startade 30 dagars gratis trial');
    
  ELSIF user_profile.trial_used = FALSE THEN
    -- Uppdatera befintlig profil för att starta trial
    UPDATE user_profiles 
    SET 
      trial_started_at = NOW(),
      trial_ends_at = NOW() + trial_duration,
      trial_used = TRUE,
      subscription_status = 'trial',
      updated_at = NOW()
    WHERE id = user_id
    RETURNING * INTO user_profile;
    
    -- Logga trial-start
    INSERT INTO trial_activities (user_id, activity_type, description)
    VALUES (user_id, 'trial_started', 'Användare startade 30 dagars gratis trial');
  END IF;
  
  RETURN user_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lägg till funktion för att kontrollera trial-status
CREATE OR REPLACE FUNCTION check_trial_status(user_id UUID)
RETURNS TABLE (
  is_in_trial BOOLEAN,
  trial_days_remaining INTEGER,
  subscription_status TEXT,
  trial_ends_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  user_profile user_profiles;
BEGIN
  SELECT * INTO user_profile FROM user_profiles WHERE id = user_id;
  
  IF user_profile.id IS NULL THEN
    -- Ingen profil finns - användaren är berättigad till trial
    RETURN QUERY SELECT FALSE, 30, 'none'::TEXT, NULL::TIMESTAMP WITH TIME ZONE;
  ELSIF user_profile.trial_ends_at IS NOT NULL AND user_profile.trial_ends_at > NOW() THEN
    -- Användaren är i aktiv trial
    RETURN QUERY SELECT 
      TRUE,
      EXTRACT(days FROM (user_profile.trial_ends_at - NOW()))::INTEGER,
      user_profile.subscription_status,
      user_profile.trial_ends_at;
  ELSE
    -- Trial har slutat eller aldrig startats
    RETURN QUERY SELECT 
      FALSE,
      0,
      user_profile.subscription_status,
      user_profile.trial_ends_at;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Lägg till kolumn i handbooks för att spåra om det är en trial-handbok
ALTER TABLE handbooks ADD COLUMN IF NOT EXISTS is_trial_handbook BOOLEAN DEFAULT FALSE;
ALTER TABLE handbooks ADD COLUMN IF NOT EXISTS created_during_trial BOOLEAN DEFAULT FALSE;

-- Skapa index för performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_trial_ends_at ON user_profiles(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_status ON user_profiles(subscription_status);
CREATE INDEX IF NOT EXISTS idx_trial_activities_user_id ON trial_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_trial_activities_activity_type ON trial_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_handbooks_trial ON handbooks(is_trial_handbook, created_during_trial);

-- Kommentarer för dokumentation
COMMENT ON TABLE user_profiles IS 'Användarprofiler med trial- och prenumerationsinformation';
COMMENT ON TABLE trial_activities IS 'Aktivitetslogg för trial-relaterade händelser';
COMMENT ON FUNCTION start_user_trial IS 'Startar 30 dagars gratis trial för en användare';
COMMENT ON FUNCTION check_trial_status IS 'Kontrollerar trial-status för en användare'; 