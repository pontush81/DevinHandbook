-- GDPR Compliance Migration
-- Skapar alla tabeller som behövs för GDPR-compliance enligt våra juridiska åtaganden
-- Datum: 2024-12-27

-- 1. Tabell för schemalagd dataradering (90-dagars regel)
CREATE TABLE IF NOT EXISTS account_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Vem/vad som ska raderas
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  handbook_id UUID REFERENCES handbooks(id) ON DELETE CASCADE,
  
  -- Schemaläggning
  deletion_requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '90 days'),
  
  -- Status och metadata
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'warned_75', 'warned_85', 'warned_89', 'completed', 'cancelled')),
  deletion_reason TEXT,
  requested_by UUID REFERENCES auth.users(id),
  
  -- Varningar
  warning_75_sent_at TIMESTAMP WITH TIME ZONE,
  warning_85_sent_at TIMESTAMP WITH TIME ZONE,
  warning_89_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Slutförande
  completed_at TIMESTAMP WITH TIME ZONE,
  completed_by UUID REFERENCES auth.users(id),
  
  -- Metadata för revision
  metadata JSONB DEFAULT '{}'::JSONB
);

-- 2. GDPR-förfrågningar (export, radering, rättelse)
CREATE TABLE IF NOT EXISTS gdpr_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Vem som begär
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  
  -- Typ av förfrågan
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'deletion', 'rectification', 'portability')),
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  
  -- Tidshantering
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Resultat
  data_exported_url TEXT, -- Säker nedladdningslänk för export
  data_exported_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  request_details JSONB DEFAULT '{}'::JSONB,
  processing_notes TEXT,
  error_message TEXT,
  
  -- Behandlad av
  processed_by UUID REFERENCES auth.users(id),
  
  -- IP-adress för säkerhet
  request_ip INET,
  user_agent TEXT
);

-- 3. Användarsamtycken (cookies, marknadsföring, etc.)
CREATE TABLE IF NOT EXISTS user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Användare
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Typ av samtycke
  consent_type TEXT NOT NULL CHECK (consent_type IN ('cookies', 'marketing', 'analytics', 'third_party_data', 'data_processing')),
  
  -- Samtycke-status
  granted BOOLEAN NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  withdrawn_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata för bevisning
  ip_address INET,
  user_agent TEXT,
  consent_method TEXT, -- 'checkbox', 'banner', 'api', etc.
  consent_version TEXT, -- Version av samtycke-texten
  
  -- Juridisk grund
  legal_basis TEXT, -- 'consent', 'legitimate_interest', 'contract', etc.
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB
);

-- 4. Audit logs för alla viktiga aktiviteter
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Användare (kan vara null för systemaktiviteter)
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  
  -- Aktivitet
  action TEXT NOT NULL, -- 'login', 'data_export', 'data_deletion', 'handbook_access', etc.
  resource_type TEXT, -- 'handbook', 'user', 'payment', 'gdpr_request'
  resource_id UUID,
  
  -- Resultat
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  
  -- Kontext
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Säkerhet
  risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
);

-- 5. Säkerhetsincidenter
CREATE TABLE IF NOT EXISTS security_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Incident-typ
  incident_type TEXT NOT NULL CHECK (incident_type IN ('data_breach', 'unauthorized_access', 'system_compromise', 'ddos_attack', 'malware', 'other')),
  
  -- Allvarlighetsgrad
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  -- Beskrivning
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Berörda användare
  affected_users UUID[],
  affected_user_count INTEGER DEFAULT 0,
  
  -- Tidslinjer
  detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  incident_started_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'contained', 'resolved', 'closed')),
  
  -- Rapportering
  reported_to_authority BOOLEAN DEFAULT FALSE,
  authority_report_date TIMESTAMP WITH TIME ZONE,
  users_notified BOOLEAN DEFAULT FALSE,
  users_notification_date TIMESTAMP WITH TIME ZONE,
  
  -- Hantering
  assigned_to UUID REFERENCES auth.users(id),
  resolution_notes TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB,
  
  -- Automatisk detektion
  auto_detected BOOLEAN DEFAULT FALSE,
  detection_source TEXT -- 'manual', 'monitoring', 'user_report', etc.
);

-- 6. GDPR-dataexport cache (för att undvika att generera samma export flera gånger)
CREATE TABLE IF NOT EXISTS gdpr_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Användare
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Export-metadata
  export_type TEXT NOT NULL DEFAULT 'full' CHECK (export_type IN ('full', 'partial', 'handbook_only')),
  file_format TEXT NOT NULL DEFAULT 'json' CHECK (file_format IN ('json', 'csv', 'pdf')),
  
  -- Fil-information
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  file_checksum TEXT,
  
  -- Säkerhet
  download_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  download_count INTEGER DEFAULT 0,
  max_downloads INTEGER DEFAULT 3,
  
  -- Status
  status TEXT DEFAULT 'generating' CHECK (status IN ('generating', 'ready', 'expired', 'deleted')),
  
  -- Metadata
  data_snapshot_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes för prestanda
CREATE INDEX idx_account_deletions_scheduled_at ON account_deletions(scheduled_deletion_at) WHERE status = 'pending';
CREATE INDEX idx_account_deletions_user_id ON account_deletions(user_id);
CREATE INDEX idx_account_deletions_status ON account_deletions(status);

CREATE INDEX idx_gdpr_requests_user_id ON gdpr_requests(user_id);
CREATE INDEX idx_gdpr_requests_status ON gdpr_requests(status);
CREATE INDEX idx_gdpr_requests_type ON gdpr_requests(request_type);
CREATE INDEX idx_gdpr_requests_created_at ON gdpr_requests(created_at);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_type ON user_consents(consent_type);
CREATE INDEX idx_user_consents_granted ON user_consents(granted);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_risk_level ON audit_logs(risk_level) WHERE risk_level IN ('high', 'critical');

CREATE INDEX idx_security_incidents_severity ON security_incidents(severity);
CREATE INDEX idx_security_incidents_status ON security_incidents(status);
CREATE INDEX idx_security_incidents_detected_at ON security_incidents(detected_at);

CREATE INDEX idx_gdpr_exports_user_id ON gdpr_exports(user_id);
CREATE INDEX idx_gdpr_exports_token ON gdpr_exports(download_token);
CREATE INDEX idx_gdpr_exports_expires_at ON gdpr_exports(expires_at);

-- RLS Policies

-- account_deletions
ALTER TABLE account_deletions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Användare kan se sina egna raderingar" 
  ON account_deletions FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = requested_by);

CREATE POLICY "Admins kan hantera raderingar" 
  ON account_deletions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- gdpr_requests
ALTER TABLE gdpr_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Användare kan se sina egna GDPR-förfrågningar" 
  ON gdpr_requests FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Användare kan skapa GDPR-förfrågningar" 
  ON gdpr_requests FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins kan hantera GDPR-förfrågningar" 
  ON gdpr_requests FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- user_consents
ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Användare kan se sina egna samtycken" 
  ON user_consents FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Användare kan hantera sina egna samtycken" 
  ON user_consents FOR ALL
  USING (auth.uid() = user_id);

-- audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Användare kan se sina egna audit logs" 
  ON audit_logs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Systemet kan skapa audit logs" 
  ON audit_logs FOR INSERT 
  WITH CHECK (true); -- Systemet behöver kunna logga allt

-- security_incidents
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins kan hantera säkerhetsincidenter" 
  ON security_incidents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- gdpr_exports
ALTER TABLE gdpr_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Användare kan se sina egna exports" 
  ON gdpr_exports FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Systemet kan skapa exports" 
  ON gdpr_exports FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Triggers för updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_account_deletions_updated_at 
  BEFORE UPDATE ON account_deletions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gdpr_requests_updated_at 
  BEFORE UPDATE ON gdpr_requests 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_security_incidents_updated_at 
  BEFORE UPDATE ON security_incidents 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funktioner för GDPR-compliance

-- Funktion för att schemalägga dataradering
CREATE OR REPLACE FUNCTION schedule_data_deletion(
  p_user_id UUID,
  p_handbook_id UUID DEFAULT NULL,
  p_deletion_reason TEXT DEFAULT 'User requested account deletion'
)
RETURNS UUID AS $$
DECLARE
  deletion_id UUID;
BEGIN
  INSERT INTO account_deletions (
    user_id,
    handbook_id,
    deletion_reason,
    requested_by
  ) VALUES (
    p_user_id,
    p_handbook_id,
    p_deletion_reason,
    auth.uid()
  ) RETURNING id INTO deletion_id;
  
  -- Logga aktiviteten
  INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    p_user_id,
    'data_deletion_scheduled',
    'account_deletion',
    deletion_id,
    jsonb_build_object(
      'scheduled_for', (NOW() + INTERVAL '90 days')::text,
      'reason', p_deletion_reason
    )
  );
  
  RETURN deletion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion för att skapa GDPR-förfrågan
CREATE OR REPLACE FUNCTION create_gdpr_request(
  p_request_type TEXT,
  p_request_details JSONB DEFAULT '{}'::JSONB
)
RETURNS UUID AS $$
DECLARE
  request_id UUID;
  user_email TEXT;
BEGIN
  -- Hämta användarens e-post
  SELECT email INTO user_email 
  FROM auth.users 
  WHERE id = auth.uid();
  
  INSERT INTO gdpr_requests (
    user_id,
    user_email,
    request_type,
    request_details,
    request_ip,
    user_agent
  ) VALUES (
    auth.uid(),
    user_email,
    p_request_type,
    p_request_details,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  ) RETURNING id INTO request_id;
  
  -- Logga aktiviteten
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    auth.uid(),
    user_email,
    'gdpr_request_created',
    'gdpr_request',
    request_id,
    jsonb_build_object(
      'request_type', p_request_type,
      'details', p_request_details
    )
  );
  
  RETURN request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Funktion för att logga användaraktiviteter
CREATE OR REPLACE FUNCTION log_user_activity(
  p_action TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  user_email TEXT;
BEGIN
  -- Hämta användarens e-post om de är inloggade
  IF auth.uid() IS NOT NULL THEN
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = auth.uid();
  END IF;
  
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action,
    resource_type,
    resource_id,
    success,
    error_message,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    auth.uid(),
    user_email,
    p_action,
    p_resource_type,
    p_resource_id,
    p_success,
    p_error_message,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent',
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kommentarer för dokumentation
COMMENT ON TABLE account_deletions IS 'Schemaläggning av dataradering enligt 90-dagarsregeln';
COMMENT ON TABLE gdpr_requests IS 'GDPR-förfrågningar för export, radering och rättelse';
COMMENT ON TABLE user_consents IS 'Användarsamtycken för cookies, marknadsföring, etc.';
COMMENT ON TABLE audit_logs IS 'Audit trail för alla viktiga användaraktiviteter';
COMMENT ON TABLE security_incidents IS 'Säkerhetsincidenter och deras hantering';
COMMENT ON TABLE gdpr_exports IS 'Cache för GDPR-dataexporter';

COMMENT ON FUNCTION schedule_data_deletion(UUID, UUID, TEXT) IS 'Schemalägger dataradering efter 90 dagar';
COMMENT ON FUNCTION create_gdpr_request(TEXT, JSONB) IS 'Skapar en ny GDPR-förfrågan';
COMMENT ON FUNCTION log_user_activity(TEXT, TEXT, UUID, JSONB, BOOLEAN, TEXT) IS 'Loggar användaraktiviteter för audit trail';

-- Bekräfta att migrationen är klar
DO $$
BEGIN
  RAISE NOTICE '✅ GDPR Compliance Migration completed successfully!';
  RAISE NOTICE '   - Created 6 new tables for GDPR compliance';
  RAISE NOTICE '   - Added comprehensive RLS policies';
  RAISE NOTICE '   - Created helper functions for common operations';
  RAISE NOTICE '   - Ready for GDPR API endpoints implementation';
END $$; 