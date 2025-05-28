-- Fix RLS policies for handbook_members to allow admin permission checks
-- This fixes the 500 errors when checking admin permissions

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Medlemmar kan se handböcker de har tillgång till" ON handbook_members;
DROP POLICY IF EXISTS "Admin kan hantera medlemmar" ON handbook_members;

-- Allow users to see their own memberships
CREATE POLICY "Users can see their own memberships" 
ON handbook_members FOR SELECT 
USING (auth.uid() = user_id);

-- Allow checking admin permissions for any handbook (needed for permission checks)
-- This is what was missing - we need to allow reading admin status for permission checks
CREATE POLICY "Allow admin permission checks" 
ON handbook_members FOR SELECT 
USING (true);

-- Admin-medlemmar kan lägga till, uppdatera och ta bort andra medlemmar för samma handbok
CREATE POLICY "Admins can manage members" 
ON handbook_members FOR INSERT, UPDATE, DELETE
USING (
  EXISTS (
    SELECT 1 FROM handbook_members 
    WHERE handbook_id = handbook_members.handbook_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Lägg till kommentar
COMMENT ON TABLE handbook_members IS 'Handbok medlemmar med roller (admin, editor, viewer) - RLS policies uppdaterade för admin-kontroller'; 