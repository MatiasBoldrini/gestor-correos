-- ============================================
-- Índice adicional para contact_tags
-- Mejora el rendimiento de queries que filtran por contact_id
-- ============================================

-- El índice idx_contact_tags_tag_id ya existe (para buscar contactos por tag)
-- Este índice es para buscar tags por contacto (usado al listar contactos)
CREATE INDEX IF NOT EXISTS idx_contact_tags_contact_id ON contact_tags(contact_id);
