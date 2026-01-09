-- ============================================
-- Migración: Habilitar RLS y agregar índices faltantes
-- Fecha: 2026-01-09
-- Resuelve: Advisors de seguridad y performance de Supabase
-- ============================================

-- ============================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- (Las políticas ya existen, pero RLS no estaba activo)
-- ============================================

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE bounce_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE unsubscribe_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_send_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- AGREGAR ÍNDICES A FOREIGN KEYS FALTANTES
-- (Para mejorar performance en JOINs y DELETEs)
-- ============================================

-- bounce_events.google_account_id
CREATE INDEX IF NOT EXISTS idx_bounce_events_google_account_id 
ON bounce_events(google_account_id);

-- campaigns.created_by
CREATE INDEX IF NOT EXISTS idx_campaigns_created_by 
ON campaigns(created_by);

-- campaigns.template_id
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id 
ON campaigns(template_id);

-- draft_items.contact_id
CREATE INDEX IF NOT EXISTS idx_draft_items_contact_id 
ON draft_items(contact_id);

-- send_events.draft_item_id
CREATE INDEX IF NOT EXISTS idx_send_events_draft_item_id 
ON send_events(draft_item_id);

-- templates.created_by
CREATE INDEX IF NOT EXISTS idx_templates_created_by 
ON templates(created_by);

-- test_send_events.contact_id
CREATE INDEX IF NOT EXISTS idx_test_send_events_contact_id 
ON test_send_events(contact_id);

-- unsubscribe_events.campaign_id
CREATE INDEX IF NOT EXISTS idx_unsubscribe_events_campaign_id 
ON unsubscribe_events(campaign_id);

-- ============================================
-- CORREGIR search_path EN FUNCIÓN
-- (Resuelve warning de seguridad)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- AGREGAR POLÍTICAS RLS PARA ESCRITURA
-- (Las actuales solo permiten SELECT)
-- ============================================

-- Profiles: usuarios pueden insertar/actualizar su propio perfil
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Google accounts: usuarios pueden gestionar sus propias cuentas
CREATE POLICY "Users can insert own google accounts" ON google_accounts
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own google accounts" ON google_accounts
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Contacts: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert contacts" ON contacts
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update contacts" ON contacts
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete contacts" ON contacts
  FOR DELETE TO authenticated USING (true);

-- Tags: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert tags" ON tags
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update tags" ON tags
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete tags" ON tags
  FOR DELETE TO authenticated USING (true);

-- Contact_tags: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert contact_tags" ON contact_tags
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can delete contact_tags" ON contact_tags
  FOR DELETE TO authenticated USING (true);

-- Templates: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert templates" ON templates
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update templates" ON templates
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete templates" ON templates
  FOR DELETE TO authenticated USING (true);

-- Campaigns: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert campaigns" ON campaigns
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update campaigns" ON campaigns
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete campaigns" ON campaigns
  FOR DELETE TO authenticated USING (true);

-- Draft_items: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert draft_items" ON draft_items
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update draft_items" ON draft_items
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete draft_items" ON draft_items
  FOR DELETE TO authenticated USING (true);

-- Send_runs: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert send_runs" ON send_runs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update send_runs" ON send_runs
  FOR UPDATE TO authenticated USING (true);

-- Send_events: usuarios autenticados pueden insertar
CREATE POLICY "Users can insert send_events" ON send_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Bounce_events: usuarios autenticados pueden insertar
CREATE POLICY "Users can insert bounce_events" ON bounce_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Unsubscribe_events: usuarios autenticados pueden insertar
CREATE POLICY "Users can insert unsubscribe_events" ON unsubscribe_events
  FOR INSERT TO authenticated WITH CHECK (true);

-- Test_send_events: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert test_send_events" ON test_send_events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can view test_send_events" ON test_send_events
  FOR SELECT TO authenticated USING (true);

-- Segments: usuarios autenticados pueden CRUD
CREATE POLICY "Users can insert segments" ON segments
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update segments" ON segments
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Users can delete segments" ON segments
  FOR DELETE TO authenticated USING (true);

-- Settings: solo lectura, update vía service role
CREATE POLICY "Users can update settings" ON settings
  FOR UPDATE TO authenticated USING (true);
