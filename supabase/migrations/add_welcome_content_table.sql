-- Skapa tabell för välkomstinnehåll
CREATE TABLE IF NOT EXISTS welcome_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
  hero_title TEXT NOT NULL DEFAULT 'Välkommen till din handbok!',
  hero_subtitle TEXT NOT NULL DEFAULT 'Din guide till allt som rör ditt boende och föreningen.',
  info_cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  important_info JSONB NOT NULL DEFAULT '[]'::jsonb,
  UNIQUE(handbook_id)
);

-- Aktivera RLS
ALTER TABLE welcome_content ENABLE ROW LEVEL SECURITY;

-- RLS-policies för welcome_content
CREATE POLICY "Welcome content är synligt för alla om handboken är publicerad" 
  ON welcome_content FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = welcome_content.handbook_id 
      AND handbooks.published = true
    )
  );

CREATE POLICY "Welcome content är synligt för ägare" 
  ON welcome_content FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = welcome_content.handbook_id 
      AND handbooks.owner_id = auth.uid()
    )
  );

CREATE POLICY "Welcome content kan skapas av handbok-ägare" 
  ON welcome_content FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = welcome_content.handbook_id 
      AND handbooks.owner_id = auth.uid()
    )
  );

CREATE POLICY "Welcome content kan uppdateras av handbok-ägare" 
  ON welcome_content FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = welcome_content.handbook_id 
      AND handbooks.owner_id = auth.uid()
    )
  );

-- Skapa index för bättre prestanda
CREATE INDEX IF NOT EXISTS welcome_content_handbook_id_idx ON welcome_content(handbook_id);

-- Funktion för att automatiskt uppdatera updated_at
CREATE OR REPLACE FUNCTION update_welcome_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger för att automatiskt uppdatera updated_at
CREATE TRIGGER update_welcome_content_updated_at_trigger
  BEFORE UPDATE ON welcome_content
  FOR EACH ROW
  EXECUTE FUNCTION update_welcome_content_updated_at();

-- Kommentarer för dokumentation
COMMENT ON TABLE welcome_content IS 'Välkomstinnehåll för handböcker med editerbara kort och information';
COMMENT ON COLUMN welcome_content.hero_title IS 'Huvudrubrik på välkomstsidan';
COMMENT ON COLUMN welcome_content.hero_subtitle IS 'Underrubrik på välkomstsidan';
COMMENT ON COLUMN welcome_content.info_cards IS 'JSON-array med informationskort (titel, beskrivning, ikon, färg)';
COMMENT ON COLUMN welcome_content.important_info IS 'JSON-array med viktig information (titel, beskrivning, ikon, färg)'; 