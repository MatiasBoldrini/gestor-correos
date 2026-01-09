-- ============================================
-- Log de envíos de prueba (simulados)
-- ============================================

CREATE TABLE test_send_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  to_email TEXT NOT NULL,
  rendered_subject TEXT NOT NULL,
  rendered_html TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_test_send_events_campaign_id ON test_send_events(campaign_id);
CREATE INDEX idx_test_send_events_created_at ON test_send_events(created_at);

-- RLS
ALTER TABLE test_send_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view test_send_events" ON test_send_events
  FOR SELECT TO authenticated USING (true);
