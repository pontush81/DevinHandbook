-- Fix RLS policy för forum_categories
-- Lägg till policy som tillåter handbok-medlemmar att se kategorier

CREATE POLICY "Handbok-medlemmar kan se kategorier" 
  ON forum_categories FOR SELECT 
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE handbook_members.handbook_id = forum_categories.handbook_id 
      AND handbook_members.user_id = auth.uid()
    )
  ); 