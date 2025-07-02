-- =============================================
-- BOKNINGSSYSTEM för Bostadsrättsföreningar
-- Integreras med befintlig handbook_members struktur
-- =============================================

-- 1. BOKNINGSBARA RESURSER (gemensamhetslokal, tvättstuga, etc.)
CREATE TABLE IF NOT EXISTS booking_resources (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    handbook_id UUID NOT NULL REFERENCES public.handbooks(id) ON DELETE CASCADE,
    
    -- Grundläggande info
    name VARCHAR(100) NOT NULL,
    description TEXT,
    location VARCHAR(100), -- "Källare", "Vind", "Plan 1"
    
    -- Bokningsregler
    max_duration_hours INTEGER DEFAULT 2, -- Max tid per bokning
    max_advance_days INTEGER DEFAULT 30,  -- Hur långt i förväg man kan boka
    max_bookings_per_member INTEGER DEFAULT 2, -- Max antal aktiva bokningar per medlem
    
    -- Tillgänglighet
    available_from TIME DEFAULT '06:00',
    available_to TIME DEFAULT '22:00',
    available_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6,7], -- 1=Måndag, 7=Söndag
    
    -- Status och regler
    is_active BOOLEAN DEFAULT true,
    requires_approval BOOLEAN DEFAULT false,
    booking_instructions TEXT,
    rules TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    
    -- Prissättning (för premium-funktioner)
    cost_per_hour DECIMAL(10,2) DEFAULT 0,
    cleaning_fee DECIMAL(10,2) DEFAULT 0
);

-- 2. BOKNINGAR
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    resource_id UUID NOT NULL REFERENCES booking_resources(id) ON DELETE CASCADE,
    handbook_id UUID NOT NULL REFERENCES public.handbooks(id) ON DELETE CASCADE,
    
    -- Vem bokar (använder befintlig handbook_members struktur)
    member_id UUID NOT NULL REFERENCES handbook_members(id) ON DELETE CASCADE,
    
    -- Bokningstid
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    
    -- Detaljer
    purpose TEXT, -- "Barnkalas", "Föreningsstämma", etc.
    attendees INTEGER DEFAULT 1,
    contact_phone VARCHAR(20),
    
    -- Administrativa fält
    notes TEXT, -- Interna anteckningar för styrelsen
    admin_notes TEXT, -- Bara synlig för admins
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Kostnader (för framtida premium-funktioner)
    total_cost DECIMAL(10,2) DEFAULT 0,
    paid_at TIMESTAMPTZ,
    
    -- Förhindra överlappande bokningar
    CONSTRAINT no_double_booking EXCLUDE USING gist (
        resource_id WITH =,
        tstzrange(start_time, end_time) WITH &&
    ) WHERE (status != 'cancelled')
);

-- 3. BOKNINGSSREGLER (flexibla regler per handbok/resurs)
CREATE TABLE IF NOT EXISTS booking_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    handbook_id UUID NOT NULL REFERENCES public.handbooks(id) ON DELETE CASCADE,
    resource_id UUID REFERENCES booking_resources(id) ON DELETE CASCADE, -- NULL = gäller alla resurser
    
    -- Regel
    rule_type VARCHAR(30) NOT NULL CHECK (rule_type IN (
        'max_duration', 'max_advance_days', 'max_per_member', 
        'blackout_dates', 'member_only', 'requires_approval'
    )),
    rule_value JSONB NOT NULL, -- Flexibel data för olika regler
    
    -- Vem regeln gäller för
    applies_to_roles VARCHAR(20)[] DEFAULT ARRAY['member'], -- ['owner', 'admin', 'member', 'moderator']
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_to DATE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- 4. BOKNINGSKOMMENTARER/MEDDELANDEN
CREATE TABLE IF NOT EXISTS booking_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES handbook_members(id) ON DELETE CASCADE,
    
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false, -- Bara för styrelsen
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- SÄKERHET: Row Level Security (RLS)
-- =============================================

-- Aktivera RLS på alla tabeller
ALTER TABLE booking_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_comments ENABLE ROW LEVEL SECURITY;

-- RESURSER: Samma handbook-medlemmar som kan se handböcker kan se resurser
CREATE POLICY "Members can view resources in their handbook" ON booking_resources
    FOR SELECT USING (
        handbook_id IN (
            SELECT hm.handbook_id 
            FROM handbook_members hm 
            WHERE hm.user_id = auth.uid() 
            AND hm.status = 'active'
        )
    );

-- RESURSER: Bara ägare/admins kan skapa/redigera resurser
CREATE POLICY "Admins can manage resources" ON booking_resources
    FOR ALL USING (
        handbook_id IN (
            SELECT hm.handbook_id 
            FROM handbook_members hm 
            WHERE hm.user_id = auth.uid() 
            AND hm.role IN ('owner', 'admin')
            AND hm.status = 'active'
        )
    );

-- BOKNINGAR: Medlemmar kan se alla bokningar i sin handbok
CREATE POLICY "Members can view bookings in their handbook" ON bookings
    FOR SELECT USING (
        handbook_id IN (
            SELECT hm.handbook_id 
            FROM handbook_members hm 
            WHERE hm.user_id = auth.uid() 
            AND hm.status = 'active'
        )
    );

-- BOKNINGAR: Medlemmar kan bara skapa egna bokningar
CREATE POLICY "Members can create own bookings" ON bookings
    FOR INSERT WITH CHECK (
        member_id IN (
            SELECT hm.id 
            FROM handbook_members hm 
            WHERE hm.user_id = auth.uid()
            AND hm.handbook_id = bookings.handbook_id
            AND hm.status = 'active'
        )
    );

-- BOKNINGAR: Medlemmar kan bara redigera sina egna bokningar
CREATE POLICY "Members can update own bookings" ON bookings
    FOR UPDATE USING (
        member_id IN (
            SELECT hm.id 
            FROM handbook_members hm 
            WHERE hm.user_id = auth.uid()
            AND hm.handbook_id = bookings.handbook_id
            AND hm.status = 'active'
        )
    );

-- BOKNINGAR: Admins kan hantera alla bokningar
CREATE POLICY "Admins can manage all bookings" ON bookings
    FOR ALL USING (
        handbook_id IN (
            SELECT hm.handbook_id 
            FROM handbook_members hm 
            WHERE hm.user_id = auth.uid() 
            AND hm.role IN ('owner', 'admin')
            AND hm.status = 'active'
        )
    );

-- =============================================
-- INDEXER för prestanda
-- =============================================

CREATE INDEX idx_booking_resources_handbook ON booking_resources(handbook_id);
CREATE INDEX idx_bookings_handbook ON bookings(handbook_id);
CREATE INDEX idx_bookings_member ON bookings(member_id);
CREATE INDEX idx_bookings_resource ON bookings(resource_id);
CREATE INDEX idx_bookings_time_range ON bookings(start_time, end_time);
CREATE INDEX idx_bookings_status ON bookings(status);

-- =============================================
-- TRIGGERS för automatisk uppdatering
-- =============================================

-- Uppdatera updated_at automatiskt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_booking_resources_updated_at BEFORE UPDATE ON booking_resources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- EXAMPLE DATA för test
-- =============================================

-- Denna data körs bara om inga resurser finns ännu
DO $$
BEGIN
    -- Bara om vi har handbooks att referera till
    IF EXISTS (SELECT 1 FROM handbooks LIMIT 1) THEN
        -- Lägg till standardresurser för första handboken som test
        INSERT INTO booking_resources (handbook_id, name, description, max_duration_hours, available_from, available_to)
        SELECT 
            h.id,
            'Gemensamhetslokal',
            'Gemensam lokal för fester och möten. Plats för ca 30 personer.',
            4, -- Max 4 timmar
            '08:00'::TIME,
            '22:00'::TIME
        FROM handbooks h 
        LIMIT 1
        ON CONFLICT DO NOTHING;

        INSERT INTO booking_resources (handbook_id, name, description, max_duration_hours, available_from, available_to)
        SELECT 
            h.id,
            'Tvättstuga',
            'Gemensam tvättstuga med tvättmaskin och torktumlare.',
            2, -- Max 2 timmar
            '06:00'::TIME,
            '21:00'::TIME
        FROM handbooks h 
        LIMIT 1
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =============================================
-- KOMMENTARER FÖR DOKUMENTATION
-- =============================================

COMMENT ON TABLE booking_resources IS 'Bokningsbara resurser som gemensamhetslokaler, tvättstugor etc';
COMMENT ON TABLE bookings IS 'Individuella bokningar gjorda av medlemmar';
COMMENT ON TABLE booking_rules IS 'Flexibla regler för bokningar som kan variera per handbok/resurs';
COMMENT ON TABLE booking_comments IS 'Kommentarer och meddelanden kopplade till bokningar';

COMMENT ON COLUMN booking_resources.available_days IS 'Array med veckodagar: 1=Måndag, 2=Tisdag, ..., 7=Söndag';
COMMENT ON COLUMN bookings.status IS 'Status: pending=väntar på godkännande, confirmed=bekräftad, cancelled=avbokad, completed=genomförd';
COMMENT ON COLUMN booking_rules.rule_value IS 'JSON med regeldata, t.ex. {"max_hours": 4} eller {"blackout_start": "2024-12-24", "blackout_end": "2024-12-26"}'; 