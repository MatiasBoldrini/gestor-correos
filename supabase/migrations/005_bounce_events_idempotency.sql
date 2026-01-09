-- ============================================
-- Migración: Índices para idempotencia y performance en bounce_events
-- Fecha: 2026-01-09
-- ============================================

-- Índice único parcial para garantizar idempotencia por gmail_message_id
-- Solo aplica cuando gmail_message_id no es NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_bounce_events_gmail_message_id_unique 
ON bounce_events(gmail_message_id) 
WHERE gmail_message_id IS NOT NULL;

-- Índice para ordenamiento por fecha de detección (más recientes primero)
CREATE INDEX IF NOT EXISTS idx_bounce_events_detected_at_desc 
ON bounce_events(detected_at DESC);
