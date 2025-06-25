-- Create webhook processing logs table for monitoring webhook reliability
CREATE TABLE webhook_processing_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_id TEXT NOT NULL,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  processing_time_ms INTEGER,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  test_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX idx_webhook_logs_event_id ON webhook_processing_logs(event_id);
CREATE INDEX idx_webhook_logs_event_type ON webhook_processing_logs(event_type);
CREATE INDEX idx_webhook_logs_success ON webhook_processing_logs(success);
CREATE INDEX idx_webhook_logs_processed_at ON webhook_processing_logs(processed_at);
CREATE INDEX idx_webhook_logs_test_mode ON webhook_processing_logs(test_mode);

-- Add composite index for duplicate detection
CREATE UNIQUE INDEX idx_webhook_logs_unique_success ON webhook_processing_logs(event_id, success) 
WHERE success = true;

-- Add RLS policy (only service role can access)
ALTER TABLE webhook_processing_logs ENABLE ROW LEVEL SECURITY;

-- Create policy for service role access
CREATE POLICY "Service role can manage webhook logs" ON webhook_processing_logs
  FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE webhook_processing_logs IS 'Logs all Stripe webhook processing attempts for monitoring and debugging';
COMMENT ON COLUMN webhook_processing_logs.event_type IS 'Type of Stripe event (e.g. checkout.session.completed)';
COMMENT ON COLUMN webhook_processing_logs.event_id IS 'Unique Stripe event ID';
COMMENT ON COLUMN webhook_processing_logs.success IS 'Whether the webhook processing succeeded';
COMMENT ON COLUMN webhook_processing_logs.processing_time_ms IS 'Time taken to process the webhook in milliseconds';
COMMENT ON COLUMN webhook_processing_logs.error_message IS 'Error message if processing failed';
COMMENT ON COLUMN webhook_processing_logs.retry_count IS 'Number of retry attempts made';
COMMENT ON COLUMN webhook_processing_logs.test_mode IS 'Whether this was processed in Stripe test mode'; 