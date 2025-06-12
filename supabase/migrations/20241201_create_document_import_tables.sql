-- Tabell för att hålla reda på uppladdade dokument för import
CREATE TABLE IF NOT EXISTS document_imports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    extracted_text TEXT,
    metadata JSONB,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabell för att spara AI-analyser av dokument
CREATE TABLE IF NOT EXISTS document_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_text TEXT,
    metadata JSONB NOT NULL,
    analysis_result JSONB NOT NULL,
    template_type TEXT NOT NULL DEFAULT 'brf',
    quality_score DECIMAL(3,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skapa storage bucket för dokumentimport om det inte finns
INSERT INTO storage.buckets (id, name, public)
VALUES ('document_imports', 'document_imports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies för document_imports
ALTER TABLE document_imports ENABLE ROW LEVEL SECURITY;

-- Användare kan bara se sina egna document_imports
CREATE POLICY "Users can view own document imports" ON document_imports
    FOR SELECT USING (true); -- Temporärt tillåt alla för utveckling

CREATE POLICY "Users can insert document imports" ON document_imports
    FOR INSERT WITH CHECK (true); -- Temporärt tillåt alla för utveckling

CREATE POLICY "Users can update own document imports" ON document_imports
    FOR UPDATE USING (true); -- Temporärt tillåt alla för utveckling

-- RLS policies för document_analyses
ALTER TABLE document_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view document analyses" ON document_analyses
    FOR SELECT USING (true); -- Temporärt tillåt alla för utveckling

CREATE POLICY "Users can insert document analyses" ON document_analyses
    FOR INSERT WITH CHECK (true); -- Temporärt tillåt alla för utveckling

-- Storage policies för document_imports bucket
CREATE POLICY "Users can upload documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'document_imports');

CREATE POLICY "Users can view uploaded documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'document_imports');

CREATE POLICY "Users can delete uploaded documents" ON storage.objects
    FOR DELETE USING (bucket_id = 'document_imports');

-- Index för prestanda
CREATE INDEX IF NOT EXISTS idx_document_imports_status ON document_imports(status);
CREATE INDEX IF NOT EXISTS idx_document_imports_created_at ON document_imports(created_at);
CREATE INDEX IF NOT EXISTS idx_document_analyses_template_type ON document_analyses(template_type);
CREATE INDEX IF NOT EXISTS idx_document_analyses_created_at ON document_analyses(created_at);

-- Trigger för updated_at automatisk uppdatering
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_document_imports_updated_at
    BEFORE UPDATE ON document_imports
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Kommentar för dokumentation
COMMENT ON TABLE document_imports IS 'Håller reda på uppladdade dokument för AI-analys och handboksimport';
COMMENT ON TABLE document_analyses IS 'Sparar resultat från AI-analys av dokument för förbättring av algoritmer';

COMMENT ON COLUMN document_imports.status IS 'Status: uploaded, text_extracted, analyzed, completed, failed';
COMMENT ON COLUMN document_imports.extracted_text IS 'Extraherad råtext från dokumentet (begränsad till 50k tecken)';
COMMENT ON COLUMN document_imports.metadata IS 'Metadata från dokumentet: sidantal, språk, etc.';
COMMENT ON COLUMN document_analyses.quality_score IS 'Kvalitetspoäng för AI-analysen (0.0-1.0)';
COMMENT ON COLUMN document_analyses.template_type IS 'Typ av mall som användes för analysen: brf, generic, etc.'; 