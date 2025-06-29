-- Add RPC function to get user emails by user IDs
-- Denna funktion behövs för notifikationssystemet

CREATE OR REPLACE FUNCTION get_user_emails_by_ids(user_ids uuid[])
RETURNS TABLE(id uuid, email text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Kontrollera att användaren är autentiserad
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Access denied: authentication required';
  END IF;

  -- Returnera email-adresser för de specificerade användar-ID:na
  -- Endast för användare som tillhör samma handböcker som den begärande användaren
  RETURN QUERY
  SELECT 
    au.id,
    au.email::text
  FROM auth.users au
  WHERE au.id = ANY(user_ids)
    AND au.email IS NOT NULL
    AND EXISTS (
      -- Säkerställ att den begärande användaren har tillgång till samma handbok
      -- som målanvändarna (dvs de tillhör samma handbok)
      SELECT 1 
      FROM handbook_members hm1
      JOIN handbook_members hm2 ON hm1.handbook_id = hm2.handbook_id
      WHERE hm1.user_id = auth.uid() 
        AND hm2.user_id = au.id
    );
END;
$$;

-- Ge behörighet till autentiserade användare
GRANT EXECUTE ON FUNCTION get_user_emails_by_ids(uuid[]) TO authenticated;

-- Kommentar för dokumentation
COMMENT ON FUNCTION get_user_emails_by_ids(uuid[]) IS 
'Säker funktion för att hämta e-postadresser för användare inom samma handbok. Används av notifikationssystemet.'; 