import { Client } from "@upstash/qstash";
import { createHash } from "node:crypto";
import type { SendTickPayload } from "@/server/contracts/campaigns";
import type { SyncContactsPayload } from "@/server/contracts/contact-sources";
import { isExternalMocksEnabled } from "@/server/integrations/testing/mock-mode";

// ─────────────────────────────────────────────────────────────────────────────
// Obtener cliente QStash
// ─────────────────────────────────────────────────────────────────────────────
function getQStashClient(): Client {
  const token = process.env.QSTASH_TOKEN;

  if (!token) {
    throw new Error("QSTASH_TOKEN es requerido para programar envíos");
  }

  return new Client({ token });
}

function buildMockMessageId(input: string): string {
  const hash = createHash("sha1").update(input).digest("hex").slice(0, 16);
  return `mock-qstash-${hash}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener URL base de la aplicación (normalizada, sin trailing slash)
// ─────────────────────────────────────────────────────────────────────────────
function getBaseUrl(): string {
  // En producción usar la URL del sitio
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

  if (!siteUrl) {
    throw new Error("NEXT_PUBLIC_SITE_URL es requerido para programar ticks");
  }

  // Normalizar: quitar trailing slash para evitar URLs con doble slash
  return siteUrl.replace(/\/+$/, "");
}

// ─────────────────────────────────────────────────────────────────────────────
// Programar un tick de envío
// ─────────────────────────────────────────────────────────────────────────────
export async function scheduleSendTick(options: {
  campaignId: string;
  sendRunId: string;
  delaySeconds: number;
}): Promise<{ messageId: string }> {
  const { campaignId, sendRunId, delaySeconds } = options;

  if (isExternalMocksEnabled()) {
    return {
      messageId: buildMockMessageId(
        `send-tick|${campaignId}|${sendRunId}|${delaySeconds}`
      ),
    };
  }

  const client = getQStashClient();
  const baseUrl = getBaseUrl();

  const payload: SendTickPayload = { campaignId, sendRunId };

  const response = await client.publishJSON({
    url: `${baseUrl}/api/jobs/send-tick`,
    body: payload,
    delay: delaySeconds,
    retries: 3,
  });

  return { messageId: response.messageId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Programar un tick para una fecha/hora específica
// ─────────────────────────────────────────────────────────────────────────────
export async function scheduleSendTickAt(options: {
  campaignId: string;
  sendRunId: string;
  notBefore: Date;
}): Promise<{ messageId: string }> {
  const { campaignId, sendRunId, notBefore } = options;

  if (isExternalMocksEnabled()) {
    return {
      messageId: buildMockMessageId(
        `send-tick-at|${campaignId}|${sendRunId}|${notBefore.toISOString()}`
      ),
    };
  }

  const client = getQStashClient();
  const baseUrl = getBaseUrl();

  const payload: SendTickPayload = { campaignId, sendRunId };

  // Calcular delay en segundos desde ahora
  const now = new Date();
  const delayMs = notBefore.getTime() - now.getTime();
  const delaySeconds = Math.max(0, Math.ceil(delayMs / 1000));

  const response = await client.publishJSON({
    url: `${baseUrl}/api/jobs/send-tick`,
    body: payload,
    delay: delaySeconds,
    retries: 3,
  });

  return { messageId: response.messageId };
}

// ─────────────────────────────────────────────────────────────────────────────
// Programar sincronización de contactos (Google Sheets)
// ─────────────────────────────────────────────────────────────────────────────
export async function scheduleContactSync(options: {
  sourceId: string;
  startRow: number;
  batchSize: number;
  syncStartedAt: string;
  headers?: string[];
  attempt?: number;
  delaySeconds?: number;
}): Promise<{ messageId: string }> {
  const { delaySeconds = 0, ...payload } = options;

  if (isExternalMocksEnabled()) {
    return {
      messageId: buildMockMessageId(
        `sync-contacts|${payload.sourceId}|${payload.startRow}|${payload.batchSize}|${delaySeconds}`
      ),
    };
  }

  const client = getQStashClient();
  const baseUrl = getBaseUrl();

  const body: SyncContactsPayload = payload;

  const response = await client.publishJSON({
    url: `${baseUrl}/api/jobs/sync-contacts`,
    body,
    delay: delaySeconds,
    retries: 3,
  });

  return { messageId: response.messageId };
}
