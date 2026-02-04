-- ============================================
-- Migración: Crear bucket público para assets de firma
-- Fecha: 2026-02-04
-- Instrucciones: Ejecutar manualmente en SQL Editor de Supabase
-- ============================================

-- Crear bucket público para imágenes de firma
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signature-assets',
  'signature-assets',
  true,
  2097152, -- 2 MB
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Política: Cualquier usuario autenticado puede subir archivos
CREATE POLICY "Authenticated users can upload signature assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signature-assets');

-- Política: Cualquier persona puede leer (bucket público)
CREATE POLICY "Public read access for signature assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'signature-assets');

-- Política: Usuario autenticado puede eliminar sus propios archivos
-- (opcional, útil para limpieza futura)
CREATE POLICY "Authenticated users can delete signature assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'signature-assets');
