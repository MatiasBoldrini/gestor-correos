import { z } from "zod/v4";

// ─────────────────────────────────────────────────────────────────────────────
// Filtros para listar bounce events
// ─────────────────────────────────────────────────────────────────────────────
export const listBouncesSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export type ListBouncesFilters = z.infer<typeof listBouncesSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Parámetros para escanear rebotes
// ─────────────────────────────────────────────────────────────────────────────
export const scanBouncesSchema = z.object({
  maxResults: z.coerce.number().int().min(1).max(500).optional().default(100),
  newerThanDays: z.coerce.number().int().min(1).max(365).optional().default(30),
  trashProcessed: z.boolean().optional().default(true),
});

export type ScanBouncesInput = z.infer<typeof scanBouncesSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Respuesta de un bounce event
// ─────────────────────────────────────────────────────────────────────────────
export type BounceEventResponse = {
  id: string;
  detectedAt: string;
  googleAccountId: string | null;
  bouncedEmail: string;
  reason: string | null;
  gmailMessageId: string | null;
  gmailPermalink: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Respuesta de listado de bounces
// ─────────────────────────────────────────────────────────────────────────────
export type BouncesListResponse = {
  bounces: BounceEventResponse[];
  total: number;
  limit: number;
  offset: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Respuesta del escaneo de rebotes
// ─────────────────────────────────────────────────────────────────────────────
export type ScanBouncesResponse = {
  scanned: number;
  created: number;
  suppressed: number;
  trashed: number;
  errors: Array<{ messageId: string; error: string }>;
};
