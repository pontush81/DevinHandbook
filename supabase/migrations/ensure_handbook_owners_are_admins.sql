-- Säkerställ att alla handbok-ägare är admins i handbook_members
-- Detta är en säkerhetsåtgärd för befintliga handböcker

INSERT INTO handbook_members (handbook_id, user_id, role, created_at)
SELECT 
  h.id as handbook_id,
  h.owner_id as user_id,
  'admin' as role,
  COALESCE(h.created_at, NOW()) as created_at
FROM handbooks h
WHERE h.owner_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM handbook_members hm 
    WHERE hm.handbook_id = h.id 
    AND hm.user_id = h.owner_id
  )
ON CONFLICT (handbook_id, user_id) DO NOTHING;

-- Lägg till kommentar
COMMENT ON TABLE handbook_members IS 'Handbok medlemmar med roller (admin, editor, viewer). Handbok-ägare läggs automatiskt till som admin.'; 