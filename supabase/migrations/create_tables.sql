CREATE TABLE IF NOT EXISTS handbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  subdomain TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id),
  published BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  description TEXT,
  order INTEGER NOT NULL,
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  title TEXT NOT NULL,
  content TEXT,
  order INTEGER NOT NULL,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE
);

ALTER TABLE handbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Handbooks are viewable by everyone if published" 
  ON handbooks FOR SELECT 
  USING (published = true);

CREATE POLICY "Handbooks are viewable by owners" 
  ON handbooks FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Handbooks are insertable by anyone authenticated" 
  ON handbooks FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Handbooks are updatable by owners" 
  ON handbooks FOR UPDATE 
  USING (auth.uid() = user_id);

INSERT INTO storage.buckets (id, name) 
VALUES ('handbook_files', 'handbook_files') 
ON CONFLICT DO NOTHING;

CREATE POLICY "Handbook files are viewable by everyone"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'handbook_files');

CREATE POLICY "Handbook files are uploadable by authenticated users"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'handbook_files' AND auth.role() = 'authenticated');
