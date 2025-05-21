-- Uppdatera handbooks-tabellen: ändra kolumnnamn från user_id till owner_id
ALTER TABLE handbooks 
  RENAME COLUMN user_id TO owner_id;

-- Uppdatera RLS-policies för att använda owner_id istället för user_id
DROP POLICY IF EXISTS "Handbooks are viewable by owners" ON handbooks;
CREATE POLICY "Handbooks are viewable by owners" 
  ON handbooks FOR SELECT 
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Handbooks are updatable by owners" ON handbooks;
CREATE POLICY "Handbooks are updatable by owners" 
  ON handbooks FOR UPDATE 
  USING (auth.uid() = owner_id);

-- Skapa funktioner för att hantera användarkonvertering till profiles
CREATE OR REPLACE FUNCTION public.create_profile_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, is_superadmin)
  VALUES (
    NEW.id,
    NEW.email,
    CURRENT_TIMESTAMP,
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigga funktionen vid nya användarregistreringar
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_profile_for_new_user(); 