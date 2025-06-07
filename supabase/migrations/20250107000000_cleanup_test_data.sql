-- Rensa all testdata innan produktionslansering
-- Denna migration tar bort all data men behåller tabellstrukturen

-- Disable foreign key checks temporarily
SET session_replication_role = replica;

-- Rensa i rätt ordning för att undvika foreign key-konflikter
DELETE FROM forum_posts;
DELETE FROM forum_topics;
DELETE FROM forum_categories;
DELETE FROM pages;
DELETE FROM sections;
DELETE FROM handbook_members;
DELETE FROM welcome_content;
DELETE FROM handbooks;

-- Rensa auth-relaterade tabeller som kan ha testdata
DELETE FROM profiles WHERE email LIKE '%test%' OR email LIKE '%example%';

-- Re-enable foreign key checks
SET session_replication_role = DEFAULT;

-- Reset sequences if needed (optional)
-- ALTER SEQUENCE handbooks_id_seq RESTART WITH 1;
-- ALTER SEQUENCE sections_id_seq RESTART WITH 1;
-- ALTER SEQUENCE pages_id_seq RESTART WITH 1;

-- Lägg till kommentar
COMMENT ON SCHEMA public IS 'Database cleaned of test data on 2025-01-07 - ready for production';

-- Bekräfta att databasen är ren
DO $$
DECLARE
    handbook_count INTEGER;
    section_count INTEGER;
    page_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO handbook_count FROM handbooks;
    SELECT COUNT(*) INTO section_count FROM sections;
    SELECT COUNT(*) INTO page_count FROM pages;
    
    RAISE NOTICE 'Database cleanup completed:';
    RAISE NOTICE '- Handbooks: % records remaining', handbook_count;
    RAISE NOTICE '- Sections: % records remaining', section_count;
    RAISE NOTICE '- Pages: % records remaining', page_count;
    
    IF handbook_count = 0 AND section_count = 0 AND page_count = 0 THEN
        RAISE NOTICE '✅ Database is clean and ready for production!';
    ELSE
        RAISE WARNING '⚠️ Some test data may still remain in the database';
    END IF;
END $$; 