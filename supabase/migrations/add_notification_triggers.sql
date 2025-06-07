-- Add notification system for forum
-- Skapar triggers och funktioner för att skicka notifikationer när meddelanden skapas

-- Lägg till user preferences för notifikationer
CREATE TABLE IF NOT EXISTS user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  handbook_id UUID NOT NULL REFERENCES handbooks(id) ON DELETE CASCADE,
  
  -- Notifikationsinställningar
  email_new_topics BOOLEAN DEFAULT true,
  email_new_replies BOOLEAN DEFAULT true,
  email_mentions BOOLEAN DEFAULT true,
  
  -- In-app notifikationer
  app_new_topics BOOLEAN DEFAULT true,
  app_new_replies BOOLEAN DEFAULT true,
  app_mentions BOOLEAN DEFAULT true,
  
  UNIQUE(user_id, handbook_id)
);

-- Aktivera RLS
ALTER TABLE user_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS-policy för notifikationsinställningar
CREATE POLICY "Användare kan hantera sina egna notifikationsinställningar" 
  ON user_notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index för prestanda
CREATE INDEX IF NOT EXISTS user_notification_preferences_user_id_idx 
  ON user_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS user_notification_preferences_handbook_id_idx 
  ON user_notification_preferences(handbook_id);

-- Funktion för att skapa standard notifikationsinställningar för nya medlemmar
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_notification_preferences (
    user_id, 
    handbook_id,
    email_new_topics,
    email_new_replies,
    email_mentions,
    app_new_topics,
    app_new_replies,
    app_mentions
  ) VALUES (
    NEW.user_id,
    NEW.handbook_id,
    true,  -- email_new_topics
    true,  -- email_new_replies
    true,  -- email_mentions
    true,  -- app_new_topics
    true,  -- app_new_replies
    true   -- app_mentions
  )
  ON CONFLICT (user_id, handbook_id) 
  DO NOTHING; -- Gör ingenting om inställningen redan finns
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger för att skapa standard notifikationsinställningar
CREATE TRIGGER create_default_notification_preferences_trigger
  AFTER INSERT ON handbook_members
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();

-- Funktion för att hantera webhook-anrop för notifikationer
CREATE OR REPLACE FUNCTION notify_forum_activity()
RETURNS TRIGGER AS $$
DECLARE
  webhook_url TEXT;
  payload JSON;
  request_id UUID;
BEGIN
  -- Hämta webhook URL från miljövariabler eller config
  webhook_url := current_setting('app.webhook_url', true);
  
  -- Om webhook URL inte är konfigurerad, hoppa över
  IF webhook_url IS NULL OR webhook_url = '' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Skapa payload beroende på trigger-typ
  IF TG_TABLE_NAME = 'forum_topics' AND TG_OP = 'INSERT' THEN
    payload := json_build_object(
      'type', 'new_topic',
      'handbook_id', NEW.handbook_id,
      'topic_id', NEW.id,
      'author_name', NEW.author_name,
      'content_preview', LEFT(NEW.content, 200),
      'title', NEW.title
    );
  ELSIF TG_TABLE_NAME = 'forum_posts' AND TG_OP = 'INSERT' THEN
    payload := json_build_object(
      'type', 'new_reply',
      'handbook_id', NEW.handbook_id,
      'topic_id', NEW.topic_id,
      'post_id', NEW.id,
      'author_name', NEW.author_name,
      'content_preview', LEFT(NEW.content, 200)
    );
  END IF;

  -- Skicka webhook-anrop (detta kräver att http extension är aktiverad)
  -- Detta är en asynkron operation som inte blockerar transaktionen
  BEGIN
    PERFORM net.http_post(
      url := webhook_url || '/api/notifications/send',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.webhook_secret', true)
      ),
      body := payload::text
    );
  EXCEPTION WHEN OTHERS THEN
    -- Logga fel men låt inte webhook-fel stoppa huvudoperationen
    RAISE WARNING 'Failed to send notification webhook: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger för nya topics (bara om http extension är tillgänglig)
-- Detta kommer att försöka skicka webhook men misslyckas tyst om extension saknas
DO $$
BEGIN
  -- Skapa trigger bara om net extension finns
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http') THEN
    CREATE TRIGGER forum_topic_notification_trigger
      AFTER INSERT ON forum_topics
      FOR EACH ROW
      EXECUTE FUNCTION notify_forum_activity();
      
    CREATE TRIGGER forum_post_notification_trigger
      AFTER INSERT ON forum_posts
      FOR EACH ROW
      EXECUTE FUNCTION notify_forum_activity();
  ELSE
    RAISE NOTICE 'HTTP extension not available - webhook triggers not created';
  END IF;
END
$$;

-- Trigger för updated_at på notifikationsinställningar
CREATE TRIGGER update_user_notification_preferences_updated_at
  BEFORE UPDATE ON user_notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Kommentarer för dokumentation
COMMENT ON TABLE user_notification_preferences IS 'Användarinställningar för notifikationer per handbok';
COMMENT ON FUNCTION create_default_notification_preferences() IS 'Skapar standard notifikationsinställningar för nya medlemmar';
COMMENT ON FUNCTION notify_forum_activity() IS 'Skickar webhook för forum-aktivitet (kräver http extension)'; 