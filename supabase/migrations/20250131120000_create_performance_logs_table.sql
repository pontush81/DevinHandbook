-- Create performance_logs table for monitoring API performance
CREATE TABLE performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    handbook_id UUID NOT NULL,
    endpoint_path TEXT NOT NULL,
    http_method TEXT NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX idx_performance_logs_handbook_id ON performance_logs(handbook_id);
CREATE INDEX idx_performance_logs_created_at ON performance_logs(created_at);
CREATE INDEX idx_performance_logs_endpoint_path ON performance_logs(endpoint_path);
CREATE INDEX idx_performance_logs_status_code ON performance_logs(status_code);

-- Add foreign key constraint
ALTER TABLE performance_logs 
ADD CONSTRAINT fk_performance_logs_handbook_id 
FOREIGN KEY (handbook_id) REFERENCES handbooks(id) ON DELETE CASCADE;

-- Add RLS policies
ALTER TABLE performance_logs ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to view logs for their handbooks
CREATE POLICY "Users can view performance logs for their handbooks" ON performance_logs
FOR SELECT USING (
    handbook_id IN (
        SELECT handbook_id FROM handbook_members 
        WHERE user_id = auth.uid()
    )
);

-- Policy for system to insert logs
CREATE POLICY "System can insert performance logs" ON performance_logs
FOR INSERT WITH CHECK (true);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_performance_logs_updated_at 
    BEFORE UPDATE ON performance_logs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 