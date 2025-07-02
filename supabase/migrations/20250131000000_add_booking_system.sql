-- Create booking_resources table
CREATE TABLE booking_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity INTEGER DEFAULT 1,
  advance_booking_days INTEGER DEFAULT 30,
  max_duration_hours INTEGER DEFAULT 24,
  requires_approval BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES booking_resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  purpose VARCHAR(500) NOT NULL,
  attendees INTEGER DEFAULT 1,
  contact_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'pending')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_rules table for advanced rules (future feature)
CREATE TABLE booking_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES booking_resources(id) ON DELETE CASCADE,
  rule_type VARCHAR(50) NOT NULL,
  rule_value JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create booking_conflicts view for easy conflict detection
CREATE VIEW booking_conflicts AS
SELECT 
  b1.id as booking_id,
  b1.resource_id,
  b1.start_time,
  b1.end_time,
  b2.id as conflicting_booking_id,
  b2.start_time as conflicting_start,
  b2.end_time as conflicting_end
FROM bookings b1
JOIN bookings b2 ON (
  b1.resource_id = b2.resource_id 
  AND b1.id != b2.id
  AND b1.status = 'active' 
  AND b2.status = 'active'
  AND (
    (b1.start_time >= b2.start_time AND b1.start_time < b2.end_time) OR
    (b1.end_time > b2.start_time AND b1.end_time <= b2.end_time) OR
    (b1.start_time <= b2.start_time AND b1.end_time >= b2.end_time)
  )
);

-- Add indexes for performance
CREATE INDEX idx_booking_resources_handbook_id ON booking_resources(handbook_id);
CREATE INDEX idx_booking_resources_active ON booking_resources(is_active);
CREATE INDEX idx_bookings_resource_id ON bookings(resource_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_handbook_id ON bookings(handbook_id);
CREATE INDEX idx_bookings_time_range ON bookings(start_time, end_time);
CREATE INDEX idx_bookings_status ON bookings(status);

-- Enable RLS
ALTER TABLE booking_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_rules ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_resources
CREATE POLICY "Users can view resources for their handbooks" ON booking_resources
  FOR SELECT 
  USING (
    handbook_id IN (
      SELECT hm.handbook_id 
      FROM handbook_members hm 
      WHERE hm.user_id = auth.uid() 
      AND hm.status = 'active'
    )
  );

CREATE POLICY "Owners and admins can manage resources" ON booking_resources
  FOR ALL
  USING (
    handbook_id IN (
      SELECT hm.handbook_id 
      FROM handbook_members hm 
      WHERE hm.user_id = auth.uid() 
      AND hm.role IN ('owner', 'admin')
      AND hm.status = 'active'
    )
  );

-- RLS Policies for bookings
CREATE POLICY "Users can view bookings for their handbooks" ON bookings
  FOR SELECT 
  USING (
    handbook_id IN (
      SELECT hm.handbook_id 
      FROM handbook_members hm 
      WHERE hm.user_id = auth.uid() 
      AND hm.status = 'active'
    )
  );

CREATE POLICY "Users can create bookings in their handbooks" ON bookings
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id AND
    handbook_id IN (
      SELECT hm.handbook_id 
      FROM handbook_members hm 
      WHERE hm.user_id = auth.uid() 
      AND hm.status = 'active'
    )
  );

CREATE POLICY "Users can update their own bookings" ON bookings
  FOR UPDATE 
  USING (
    auth.uid() = user_id AND
    handbook_id IN (
      SELECT hm.handbook_id 
      FROM handbook_members hm 
      WHERE hm.user_id = auth.uid() 
      AND hm.status = 'active'
    )
  );

CREATE POLICY "Users can delete their own bookings" ON bookings
  FOR DELETE 
  USING (
    auth.uid() = user_id AND
    handbook_id IN (
      SELECT hm.handbook_id 
      FROM handbook_members hm 
      WHERE hm.user_id = auth.uid() 
      AND hm.status = 'active'
    )
  );

CREATE POLICY "Admins can manage all bookings in their handbooks" ON bookings
  FOR ALL
  USING (
    handbook_id IN (
      SELECT hm.handbook_id 
      FROM handbook_members hm 
      WHERE hm.user_id = auth.uid() 
      AND hm.role IN ('owner', 'admin')
      AND hm.status = 'active'
    )
  );

-- RLS Policies for booking_rules
CREATE POLICY "Users can view rules for their handbooks" ON booking_rules
  FOR SELECT 
  USING (
    resource_id IN (
      SELECT br.id 
      FROM booking_resources br
      JOIN handbook_members hm ON br.handbook_id = hm.handbook_id
      WHERE hm.user_id = auth.uid() 
      AND hm.status = 'active'
    )
  );

CREATE POLICY "Owners and admins can manage rules" ON booking_rules
  FOR ALL
  USING (
    resource_id IN (
      SELECT br.id 
      FROM booking_resources br
      JOIN handbook_members hm ON br.handbook_id = hm.handbook_id
      WHERE hm.user_id = auth.uid() 
      AND hm.role IN ('owner', 'admin')
      AND hm.status = 'active'
    )
  );

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_booking_resources_updated_at 
  BEFORE UPDATE ON booking_resources 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
  BEFORE UPDATE ON bookings 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 