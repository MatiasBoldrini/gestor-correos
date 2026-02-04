-- Migración: Limpiar contactos huérfanos que quedaron sin membership
-- Fecha: 2026-02-04
-- 
-- CONTEXTO DEL BUG:
-- El código de sincronización usaba .select() sin paginación, y Supabase
-- por defecto limita los resultados a 1000 filas. Cuando había más de 1000
-- memberships, solo se identificaban los primeros 1000 contact_id para
-- potencial eliminación.
--
-- Aunque el DELETE de memberships eliminaba TODOS los registros (sin límite),
-- los contact_id que estaban más allá de los primeros 1000 resultados nunca
-- fueron considerados para eliminación, dejando contactos huérfanos.
--
-- Esta migración elimina todos los contactos que no tienen ningún membership.
-- IMPORTANTE: Ejecutar esto SOLO después de desplegar el fix en el código.

-- Ver cuántos contactos se van a eliminar (ejecutar primero para verificar)
SELECT COUNT(*) as contacts_a_eliminar
FROM contacts c
WHERE NOT EXISTS (
    SELECT 1 FROM contact_source_memberships csm WHERE csm.contact_id = c.id
);

-- Eliminar los contactos huérfanos
DELETE FROM contacts
WHERE id IN (
    SELECT c.id
    FROM contacts c
    LEFT JOIN contact_source_memberships csm ON csm.contact_id = c.id
    WHERE csm.contact_id IS NULL
);
