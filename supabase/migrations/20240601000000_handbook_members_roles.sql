-- Migrera data från handbook_permissions till handbook_members
-- och utöka handbook_members med rollhantering

-- 1. Lägg till kolumnen 'role' till handbook_members om den inte finns
ALTER TABLE handbook_members ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin';

-- 2. Skapa index för snabbare sökningar
CREATE INDEX IF NOT EXISTS handbook_members_user_id_idx ON handbook_members(user_id);
CREATE INDEX IF NOT EXISTS handbook_members_handbook_id_idx ON handbook_members(handbook_id);
CREATE INDEX IF NOT EXISTS handbook_members_role_idx ON handbook_members(role);

-- 3. Kopiera data från handbook_permissions till handbook_members
-- Vi ignorerar konflikter för att undvika dubletter
INSERT INTO handbook_members (handbook_id, user_id, role, created_at)
SELECT handbook_id, owner_id, 
       CASE WHEN role = 'admin' THEN 'admin' 
            WHEN role = 'editor' THEN 'editor' 
            ELSE 'viewer' 
       END as role,
       COALESCE(created_at, NOW())
FROM handbook_permissions
ON CONFLICT (handbook_id, user_id) DO NOTHING;

-- 4. Uppdatera RLS-policies för handbook_members
-- Ta bort befintliga policies
DROP POLICY IF EXISTS "Tillåt användare att se sina egna medlemskap" ON handbook_members;
DROP POLICY IF EXISTS "Handbok ägare kan lägga till medlemmar" ON handbook_members;

-- Medlemmar kan se sina egna handböcker
CREATE POLICY "Medlemmar kan se handböcker de har tillgång till" 
ON handbook_members FOR SELECT 
USING (auth.uid() = user_id);

-- Admin-medlemmar kan lägga till, uppdatera och ta bort andra medlemmar för samma handbok
CREATE POLICY "Admin kan hantera medlemmar" 
ON handbook_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM handbook_members 
    WHERE handbook_id = handbook_members.handbook_id 
    AND user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- 5. Lägg till kommentarer på schema
COMMENT ON TABLE handbook_members IS 'Handbok medlemmar med roller (admin, editor, viewer)';
COMMENT ON COLUMN handbook_members.role IS 'Användarroll: admin, editor, viewer';

-- 6. Lägg till begränsningar för role-kolumnen
ALTER TABLE handbook_members DROP CONSTRAINT IF EXISTS handbook_members_role_check;
ALTER TABLE handbook_members ADD CONSTRAINT handbook_members_role_check 
  CHECK (role IN ('admin', 'editor', 'viewer')); 