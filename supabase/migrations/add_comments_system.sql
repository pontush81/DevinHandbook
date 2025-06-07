-- Forum-system för digital handbok
-- Skapar diskussionstrådar (topics) och inlägg istället av kommentarer på sidor

-- Skapa forum_categories tabell för att organisera diskussioner
CREATE TABLE IF NOT EXISTS forum_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER DEFAULT 0,
  icon TEXT DEFAULT 'MessageCircle',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Statistik (cachad för prestanda)
  topic_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(handbook_id, name)
);

-- Skapa forum_topics tabell för diskussionstrådar
CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES forum_categories(id) ON DELETE CASCADE,
  
  -- Topic-innehåll
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT,
  
  -- Status
  is_published BOOLEAN DEFAULT true,
  is_pinned BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  is_flagged BOOLEAN DEFAULT false,
  
  -- Statistik
  reply_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  last_reply_at TIMESTAMP WITH TIME ZONE,
  last_reply_by UUID REFERENCES auth.users(id),
  last_reply_by_name TEXT,
  
  -- Moderation
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT title_not_empty CHECK (length(trim(title)) > 0),
  CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0)
);

-- Skapa forum_posts tabell för svar i trådar
CREATE TABLE IF NOT EXISTS forum_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  
  -- Post-innehåll
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_email TEXT,
  
  -- Referens till annat inlägg (för @mentions eller citationer)
  reply_to_post_id UUID REFERENCES forum_posts(id) ON DELETE SET NULL,
  
  -- Status
  is_published BOOLEAN DEFAULT true,
  is_flagged BOOLEAN DEFAULT false,
  
  -- Moderation
  moderated_by UUID REFERENCES auth.users(id),
  moderated_at TIMESTAMP WITH TIME ZONE,
  
  CONSTRAINT content_not_empty CHECK (length(trim(content)) > 0)
);

-- Aktivera RLS på alla tabeller
ALTER TABLE forum_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE forum_posts ENABLE ROW LEVEL SECURITY;

-- RLS-policies för forum_categories
CREATE POLICY "Kategorier synliga för publika handböcker" 
  ON forum_categories FOR SELECT 
  USING (
    is_active = true AND
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = forum_categories.handbook_id 
      AND handbooks.published = true
    )
  );

CREATE POLICY "Admin kan hantera kategorier" 
  ON forum_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE handbook_members.handbook_id = forum_categories.handbook_id 
      AND handbook_members.user_id = auth.uid() 
      AND handbook_members.role = 'admin'
    )
  );

-- RLS-policies för forum_topics
CREATE POLICY "Topics synliga för publika handböcker" 
  ON forum_topics FOR SELECT 
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = forum_topics.handbook_id 
      AND handbooks.published = true
    )
  );

CREATE POLICY "Handbok-medlemmar kan se alla topics" 
  ON forum_topics FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE handbook_members.handbook_id = forum_topics.handbook_id 
      AND handbook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Autentiserade kan skapa topics" 
  ON forum_topics FOR INSERT 
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = forum_topics.handbook_id 
      AND (
        handbooks.published = true OR
        EXISTS (
          SELECT 1 FROM handbook_members 
          WHERE handbook_members.handbook_id = handbooks.id 
          AND handbook_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Författare kan uppdatera sina topics" 
  ON forum_topics FOR UPDATE 
  USING (auth.uid() = author_id AND NOT is_locked)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admin kan moderera topics" 
  ON forum_topics FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE handbook_members.handbook_id = forum_topics.handbook_id 
      AND handbook_members.user_id = auth.uid() 
      AND handbook_members.role = 'admin'
    )
  );

-- RLS-policies för forum_posts
CREATE POLICY "Posts synliga för publika handböcker" 
  ON forum_posts FOR SELECT 
  USING (
    is_published = true AND
    EXISTS (
      SELECT 1 FROM handbooks 
      WHERE handbooks.id = forum_posts.handbook_id 
      AND handbooks.published = true
    )
  );

CREATE POLICY "Handbok-medlemmar kan se alla posts" 
  ON forum_posts FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE handbook_members.handbook_id = forum_posts.handbook_id 
      AND handbook_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Autentiserade kan posta svar" 
  ON forum_posts FOR INSERT 
  WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (
      SELECT 1 FROM forum_topics 
      WHERE forum_topics.id = forum_posts.topic_id 
      AND NOT forum_topics.is_locked
      AND EXISTS (
        SELECT 1 FROM handbooks 
        WHERE handbooks.id = forum_posts.handbook_id 
        AND (
          handbooks.published = true OR
          EXISTS (
            SELECT 1 FROM handbook_members 
            WHERE handbook_members.handbook_id = handbooks.id 
            AND handbook_members.user_id = auth.uid()
          )
        )
      )
    )
  );

CREATE POLICY "Författare kan uppdatera sina posts" 
  ON forum_posts FOR UPDATE 
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Admin kan moderera posts" 
  ON forum_posts FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM handbook_members 
      WHERE handbook_members.handbook_id = forum_posts.handbook_id 
      AND handbook_members.user_id = auth.uid() 
      AND handbook_members.role = 'admin'
    )
  );

-- Index för prestanda
CREATE INDEX IF NOT EXISTS forum_categories_handbook_id_idx ON forum_categories(handbook_id, order_index);
CREATE INDEX IF NOT EXISTS forum_topics_category_id_idx ON forum_topics(category_id, is_pinned DESC, last_reply_at DESC);
CREATE INDEX IF NOT EXISTS forum_topics_handbook_id_idx ON forum_topics(handbook_id);
CREATE INDEX IF NOT EXISTS forum_topics_author_id_idx ON forum_topics(author_id);
CREATE INDEX IF NOT EXISTS forum_posts_topic_id_idx ON forum_posts(topic_id, created_at ASC);
CREATE INDEX IF NOT EXISTS forum_posts_handbook_id_idx ON forum_posts(handbook_id);
CREATE INDEX IF NOT EXISTS forum_posts_author_id_idx ON forum_posts(author_id);

-- Funktioner för att uppdatera statistik

-- Uppdatera topic reply_count och last_reply
CREATE OR REPLACE FUNCTION update_topic_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_topics 
    SET 
      reply_count = reply_count + 1,
      last_reply_at = NEW.created_at,
      last_reply_by = NEW.author_id,
      last_reply_by_name = NEW.author_name
    WHERE id = NEW.topic_id;
    
    -- Uppdatera kategori-statistik
    UPDATE forum_categories 
    SET 
      post_count = post_count + 1,
      last_activity_at = NEW.created_at
    WHERE id = (SELECT category_id FROM forum_topics WHERE id = NEW.topic_id);
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_topics 
    SET reply_count = GREATEST(reply_count - 1, 0)
    WHERE id = OLD.topic_id;
    
    -- Uppdatera kategori-statistik
    UPDATE forum_categories 
    SET post_count = GREATEST(post_count - 1, 0)
    WHERE id = (SELECT category_id FROM forum_topics WHERE id = OLD.topic_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Uppdatera kategori-statistik när topics skapas/tas bort
CREATE OR REPLACE FUNCTION update_category_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_categories 
    SET 
      topic_count = topic_count + 1,
      last_activity_at = NEW.created_at
    WHERE id = NEW.category_id;
    
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_categories 
    SET topic_count = GREATEST(topic_count - 1, 0)
    WHERE id = OLD.category_id;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers för statistik
CREATE TRIGGER update_topic_reply_stats
  AFTER INSERT OR DELETE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_topic_stats();

CREATE TRIGGER update_category_topic_stats
  AFTER INSERT OR DELETE ON forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_category_stats();

-- Trigger för updated_at
CREATE TRIGGER update_forum_categories_updated_at
  BEFORE UPDATE ON forum_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_topics_updated_at
  BEFORE UPDATE ON forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_forum_posts_updated_at
  BEFORE UPDATE ON forum_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Skapa notifikationstabell för forum
CREATE TABLE IF NOT EXISTS forum_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Referens till forum-innehåll
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  post_id UUID REFERENCES forum_posts(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL CHECK (notification_type IN ('new_topic', 'new_reply', 'topic_locked', 'post_flagged')),
  
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  -- Email-status
  email_sent BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(recipient_id, topic_id, post_id, notification_type)
);

ALTER TABLE forum_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Användare kan se sina forum-notifikationer" 
  ON forum_notifications FOR SELECT 
  USING (auth.uid() = recipient_id);

-- Kommentarer för dokumentation
COMMENT ON TABLE forum_categories IS 'Kategorier för forum-diskussioner i digital handbok';
COMMENT ON TABLE forum_topics IS 'Diskussionstrådar i forumet';
COMMENT ON TABLE forum_posts IS 'Inlägg/svar i forum-trådar';
COMMENT ON TABLE forum_notifications IS 'Notifikationer för forum-aktivitet'; 