-- Migration: Booking Race Condition Fixes
-- Skapad: 2025-01-01
-- Beskrivning: Implementerar advisory locks och andra säkerhetsförbättringar för bokningssystemet

-- 1. Skapa advisory lock funktioner för race condition-skydd
CREATE OR REPLACE FUNCTION pg_advisory_lock(key bigint)
RETURNS boolean AS $$
BEGIN
    -- Försök att låsa nyckeln
    PERFORM pg_advisory_lock(key);
    RETURN true;
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION pg_advisory_unlock(key bigint)
RETURNS boolean AS $$
BEGIN
    -- Frigör låset
    RETURN pg_advisory_unlock(key);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Förbättra booking-tabellen med bättre indexering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_resource_time_status 
ON bookings(resource_id, start_time, end_time, status) 
WHERE status != 'cancelled';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_user_week 
ON bookings(user_id, start_time) 
WHERE status != 'cancelled';

-- 3. Skapa funktion för säker konfliktdetektering
CREATE OR REPLACE FUNCTION check_booking_conflicts(
    p_resource_id uuid,
    p_start_time timestamptz,
    p_end_time timestamptz,
    p_exclude_id uuid DEFAULT NULL
)
RETURNS TABLE(
    conflict_count integer,
    conflict_details text[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::integer as conflict_count,
        ARRAY_AGG(
            'Konflikt: ' || 
            to_char(start_time AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI') || 
            ' - ' || 
            to_char(end_time AT TIME ZONE 'Europe/Stockholm', 'YYYY-MM-DD HH24:MI')
        ) as conflict_details
    FROM bookings
    WHERE resource_id = p_resource_id
      AND status != 'cancelled'
      AND (p_exclude_id IS NULL OR id != p_exclude_id)
      AND tstzrange(start_time, end_time) && tstzrange(p_start_time, p_end_time);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Skapa funktion för veckovis bokningskontroll
CREATE OR REPLACE FUNCTION check_weekly_booking_limit(
    p_user_id uuid,
    p_start_time timestamptz,
    p_max_per_week integer
)
RETURNS TABLE(
    current_count integer,
    exceeds_limit boolean
) AS $$
DECLARE
    week_start timestamptz;
    week_end timestamptz;
    booking_count integer;
BEGIN
    -- Beräkna veckostart (måndag) i svensk tid
    week_start := date_trunc('week', p_start_time AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'Europe/Stockholm';
    week_end := week_start + INTERVAL '7 days';
    
    -- Räkna bokningar för användaren denna vecka
    SELECT COUNT(*) INTO booking_count
    FROM bookings
    WHERE user_id = p_user_id
      AND status != 'cancelled'
      AND start_time >= week_start
      AND start_time < week_end;
    
    RETURN QUERY
    SELECT 
        booking_count as current_count,
        (booking_count >= p_max_per_week) as exceeds_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Skapa notification deduplication-tabell
CREATE TABLE IF NOT EXISTS notification_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    notification_type text NOT NULL,
    recipient_email text,
    recipient_phone text,
    sent_at timestamptz DEFAULT NOW(),
    status text DEFAULT 'sent', -- sent, failed, retrying
    attempt_count integer DEFAULT 1,
    last_error text,
    created_at timestamptz DEFAULT NOW()
);

-- Index för snabb deduplication
CREATE INDEX IF NOT EXISTS idx_notification_log_booking_type 
ON notification_log(booking_id, notification_type);

CREATE INDEX IF NOT EXISTS idx_notification_log_cleanup 
ON notification_log(created_at) WHERE status = 'sent';

-- 6. Skapa funktion för notification deduplication
CREATE OR REPLACE FUNCTION should_send_notification(
    p_booking_id uuid,
    p_notification_type text,
    p_recipient_email text DEFAULT NULL,
    p_recipient_phone text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
    existing_count integer;
BEGIN
    -- Kolla om samma notification redan skickats
    SELECT COUNT(*) INTO existing_count
    FROM notification_log
    WHERE booking_id = p_booking_id
      AND notification_type = p_notification_type
      AND status = 'sent'
      AND created_at > NOW() - INTERVAL '1 hour'; -- Deduplication window
    
    IF existing_count > 0 THEN
        RETURN FALSE;
    END IF;
    
    -- Logga att vi kommer skicka notifikation
    INSERT INTO notification_log (booking_id, notification_type, recipient_email, recipient_phone)
    VALUES (p_booking_id, p_notification_type, p_recipient_email, p_recipient_phone);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Skapa cleanup-funktion för gamla notifikationer
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM notification_log 
    WHERE created_at < NOW() - INTERVAL '7 days'
      AND status = 'sent';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Förbättra constraint med bättre felmeddelanden
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_double_booking;
ALTER TABLE bookings ADD CONSTRAINT no_double_booking 
    EXCLUDE USING gist (
        resource_id WITH =, 
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status != 'cancelled');

-- 9. Lägg till trigger för automatisk notification scheduling
CREATE OR REPLACE FUNCTION schedule_booking_notifications()
RETURNS TRIGGER AS $$
BEGIN
    -- Schemalägg påminnelser för nya bokningar
    IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
        -- 24h påminnelse
        INSERT INTO cron.job (
            jobname,
            schedule,
            command
        ) VALUES (
            'booking_reminder_24h_' || NEW.id,
            'at ' || to_char(NEW.start_time - INTERVAL '24 hours', 'YYYY-MM-DD HH24:MI:SS'),
            'SELECT send_booking_reminder(' || quote_literal(NEW.id) || ', ''24h'');'
        );
        
        -- 2h påminnelse
        INSERT INTO cron.job (
            jobname,
            schedule,
            command
        ) VALUES (
            'booking_reminder_2h_' || NEW.id,
            'at ' || to_char(NEW.start_time - INTERVAL '2 hours', 'YYYY-MM-DD HH24:MI:SS'),
            'SELECT send_booking_reminder(' || quote_literal(NEW.id) || ', ''2h'');'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS booking_notifications_trigger ON bookings;
CREATE TRIGGER booking_notifications_trigger
    AFTER INSERT ON bookings
    FOR EACH ROW EXECUTE FUNCTION schedule_booking_notifications();

-- 10. Förbättra RLS policies med bättre säkerhet
DROP POLICY IF EXISTS booking_access_policy ON bookings;
CREATE POLICY booking_access_policy ON bookings
    USING (
        EXISTS (
            SELECT 1 FROM handbook_members hm
            WHERE hm.handbook_id = bookings.handbook_id
            AND hm.user_id = auth.uid()
            AND hm.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM handbook_members hm
            WHERE hm.handbook_id = bookings.handbook_id
            AND hm.user_id = auth.uid()
            AND hm.status = 'active'
        )
    );

-- Grant permissions för funktionerna
GRANT EXECUTE ON FUNCTION pg_advisory_lock(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION pg_advisory_unlock(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION check_booking_conflicts(uuid, timestamptz, timestamptz, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_weekly_booking_limit(uuid, timestamptz, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION should_send_notification(uuid, text, text, text) TO authenticated;

-- Kommentar för framtida underhåll
COMMENT ON FUNCTION pg_advisory_lock(bigint) IS 'Säker advisory lock för race condition-skydd';
COMMENT ON FUNCTION check_booking_conflicts(uuid, timestamptz, timestamptz, uuid) IS 'Kontrollerar bokningskonflikter med svensk tidszon';
COMMENT ON TABLE notification_log IS 'Loggar notifikationer för deduplication och debugging'; 