import { z } from "zod/v4";

// ─────────────────────────────────────────────────────────────────────────────
// Listar tags
// ─────────────────────────────────────────────────────────────────────────────
export const listTagsSchema = z.object({
  kind: z.enum(["tipo", "rubro"]).optional(),
});

export type ListTagsInput = z.infer<typeof listTagsSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Crear tag
// ─────────────────────────────────────────────────────────────────────────────
export const createTagSchema = z.object({
  name: z.string().min(1).max(100).transform((v) => v.trim()),
  kind: z.enum(["tipo", "rubro"]),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Borrar tag
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTagSchema = z.object({
  id: z.string().uuid(),
});

export type DeleteTagInput = z.infer<typeof deleteTagSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Respuesta de tag
// ─────────────────────────────────────────────────────────────────────────────
export type TagResponse = {
  id: string;
  name: string;
  kind: "tipo" | "rubro";
  createdAt: string;
};
