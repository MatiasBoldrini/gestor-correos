import { z } from "zod/v4";

export const syncContactsPayloadSchema = z.object({
  sourceId: z.string().uuid(),
  startRow: z.number().int().min(2),
  batchSize: z.number().int().min(100).max(2000),
  syncStartedAt: z.string().datetime(),
  // Optimización: evitar leer headers en cada batch.
  // Se setea en el primer batch y se propaga en los siguientes.
  headers: z.array(z.string()).optional(),
  // Backoff: intentos de reintento por rate-limit/quota (mismo startRow).
  attempt: z.number().int().min(0).max(20).optional(),
});

export type SyncContactsPayload = z.infer<typeof syncContactsPayloadSchema>;

export const createContactSourceSchema = z.object({
  name: z.string().min(1).max(200),
  spreadsheetId: z.string().min(1),
  sheetTab: z.string().min(1).optional(),
});

export type CreateContactSourceInput = z.infer<typeof createContactSourceSchema>;

export const contactSourceIdSchema = z.object({
  id: z.string().uuid(),
});
