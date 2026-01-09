import { createServiceClient } from "@/lib/supabase/server";
import type { TagResponse } from "@/server/contracts/tags";

export type TagKind = "tipo" | "rubro";

// ─────────────────────────────────────────────────────────────────────────────
// Listar todos los tags (opcionalmente filtrar por kind)
// ─────────────────────────────────────────────────────────────────────────────
export async function listTags(kind?: TagKind): Promise<TagResponse[]> {
  const supabase = await createServiceClient();

  let query = supabase
    .from("tags")
    .select("id, name, kind, created_at")
    .order("name", { ascending: true });

  if (kind) {
    query = query.eq("kind", kind);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Error al listar tags: ${error.message}`);
  }

  return (data ?? []).map((tag) => ({
    id: tag.id as string,
    name: tag.name as string,
    kind: tag.kind as TagKind,
    createdAt: tag.created_at as string,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Crear un tag (devuelve el tag creado o error si ya existe)
// ─────────────────────────────────────────────────────────────────────────────
export async function createTag(
  name: string,
  kind: TagKind
): Promise<TagResponse> {
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("tags")
    .insert({ name, kind })
    .select("id, name, kind, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error(`El tag "${name}" ya existe para ${kind}`);
    }
    throw new Error(`Error al crear tag: ${error.message}`);
  }

  return {
    id: data.id as string,
    name: data.name as string,
    kind: data.kind as TagKind,
    createdAt: data.created_at as string,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Borrar un tag por ID
// ─────────────────────────────────────────────────────────────────────────────
export async function deleteTag(id: string): Promise<void> {
  const supabase = await createServiceClient();

  const { error } = await supabase.from("tags").delete().eq("id", id);

  if (error) {
    throw new Error(`Error al borrar tag: ${error.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener tags por IDs
// ─────────────────────────────────────────────────────────────────────────────
export async function getTagsByIds(ids: string[]): Promise<TagResponse[]> {
  if (ids.length === 0) return [];

  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("tags")
    .select("id, name, kind, created_at")
    .in("id", ids);

  if (error) {
    throw new Error(`Error al obtener tags: ${error.message}`);
  }

  return (data ?? []).map((tag) => ({
    id: tag.id as string,
    name: tag.name as string,
    kind: tag.kind as TagKind,
    createdAt: tag.created_at as string,
  }));
}
