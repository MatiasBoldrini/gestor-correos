import type { gmail_v1 } from "googleapis";
import { getGmailClient } from "./client";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────
export type ParsedBounce = {
  bouncedEmail: string | null;
  reason: string | null;
};

export type BounceMessage = {
  id: string;
  threadId: string | null;
  bouncedEmail: string | null;
  reason: string | null;
  permalink: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Construir query de búsqueda para rebotes
// ─────────────────────────────────────────────────────────────────────────────
function buildBounceQuery(newerThanDays: number): string {
  // Query para encontrar mensajes de rebote típicos
  const fromCriteria = "from:(mailer-daemon OR postmaster OR \"Mail Delivery Subsystem\")";
  const subjectCriteria = "(subject:(Undeliverable OR \"Delivery Status Notification\" OR \"Mail Delivery Failed\" OR \"Returned mail\" OR \"failure notice\"))";
  const timeCriteria = `newer_than:${newerThanDays}d`;

  return `${fromCriteria} ${subjectCriteria} ${timeCriteria}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Listar IDs de mensajes de rebote
// ─────────────────────────────────────────────────────────────────────────────
export async function listBounceMessageIds(options: {
  googleAccountId: string;
  maxResults: number;
  newerThanDays: number;
}): Promise<string[]> {
  const gmail = await getGmailClient(options.googleAccountId);
  const query = buildBounceQuery(options.newerThanDays);

  const messageIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const response = await gmail.users.messages.list({
      userId: "me",
      q: query,
      maxResults: Math.min(options.maxResults - messageIds.length, 100),
      pageToken,
    });

    const messages = response.data.messages ?? [];
    for (const msg of messages) {
      if (msg.id) {
        messageIds.push(msg.id);
      }
      if (messageIds.length >= options.maxResults) {
        break;
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken && messageIds.length < options.maxResults);

  return messageIds;
}

// ─────────────────────────────────────────────────────────────────────────────
// Obtener mensaje completo
// ─────────────────────────────────────────────────────────────────────────────
export async function getMessageFull(options: {
  googleAccountId: string;
  messageId: string;
}): Promise<gmail_v1.Schema$Message> {
  const gmail = await getGmailClient(options.googleAccountId);

  const response = await gmail.users.messages.get({
    userId: "me",
    id: options.messageId,
    format: "full",
  });

  return response.data;
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraer email rebotado y razón del mensaje
// ─────────────────────────────────────────────────────────────────────────────
export function extractBouncedEmailAndReason(
  message: gmail_v1.Schema$Message
): ParsedBounce {
  let bouncedEmail: string | null = null;
  let reason: string | null = null;

  // Intentar extraer del payload
  const payload = message.payload;
  if (!payload) {
    return { bouncedEmail, reason };
  }

  // Obtener el texto del mensaje (body o parts)
  const bodyText = extractBodyText(payload);

  // Intentar extraer email de distintas fuentes
  bouncedEmail = extractEmailFromBody(bodyText);

  // Intentar extraer razón
  reason = extractReasonFromBody(bodyText, message.snippet ?? null);

  return { bouncedEmail, reason };
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraer texto del body del mensaje
// ─────────────────────────────────────────────────────────────────────────────
function extractBodyText(payload: gmail_v1.Schema$MessagePart): string {
  let text = "";

  // Decodificar body si existe
  if (payload.body?.data) {
    text += decodeBase64Url(payload.body.data);
  }

  // Buscar en parts recursivamente
  if (payload.parts) {
    for (const part of payload.parts) {
      // Priorizar text/plain y message/delivery-status
      if (
        part.mimeType === "text/plain" ||
        part.mimeType === "message/delivery-status"
      ) {
        if (part.body?.data) {
          text += "\n" + decodeBase64Url(part.body.data);
        }
      }
      // Recursivo para multipart
      if (part.parts) {
        text += "\n" + extractBodyText(part);
      }
    }
  }

  return text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Decodificar base64url
// ─────────────────────────────────────────────────────────────────────────────
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraer email del body usando heurísticas
// ─────────────────────────────────────────────────────────────────────────────
function extractEmailFromBody(bodyText: string): string | null {
  // Patrones comunes en DSN (Delivery Status Notification)
  const patterns = [
    // Final-Recipient: rfc822; email@example.com
    /Final-Recipient:\s*(?:rfc822|RFC822);\s*([^\s<>]+@[^\s<>]+)/i,
    // Original-Recipient: rfc822; email@example.com
    /Original-Recipient:\s*(?:rfc822|RFC822);\s*([^\s<>]+@[^\s<>]+)/i,
    // To: email@example.com (en contexto de rebote)
    /(?:^|\n)To:\s*<?([^\s<>]+@[^\s<>]+)>?/im,
    // X-Failed-Recipients: email@example.com
    /X-Failed-Recipients?:\s*([^\s<>]+@[^\s<>]+)/i,
    // The following address(es) failed: email@example.com
    /address(?:es)?\s+failed[^:]*:\s*<?([^\s<>]+@[^\s<>]+)>?/i,
    // Delivery to the following recipient failed: email@example.com
    /recipient\s+failed[^:]*:\s*<?([^\s<>]+@[^\s<>]+)>?/i,
    // <email@example.com>: ... (formato común en postfix)
    /<([^\s<>]+@[^\s<>]+)>:\s/,
    // Fallback: buscar cualquier email que no sea de sistema
    /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/,
  ];

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match?.[1]) {
      const email = match[1].toLowerCase().trim();
      // Filtrar emails de sistema
      if (!isSystemEmail(email)) {
        return email;
      }
    }
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verificar si es un email de sistema (no queremos suprimir estos)
// ─────────────────────────────────────────────────────────────────────────────
function isSystemEmail(email: string): boolean {
  const systemPatterns = [
    /^mailer-daemon@/i,
    /^postmaster@/i,
    /^noreply@/i,
    /^no-reply@/i,
    /^mail-daemon@/i,
    /^mailerdaemon@/i,
  ];

  return systemPatterns.some((pattern) => pattern.test(email));
}

// ─────────────────────────────────────────────────────────────────────────────
// Extraer razón del rebote
// ─────────────────────────────────────────────────────────────────────────────
function extractReasonFromBody(
  bodyText: string,
  snippet: string | null
): string | null {
  // Patrones para extraer códigos/razones de error
  const patterns = [
    // Status: 5.1.1 (User unknown)
    /Status:\s*(\d+\.\d+\.\d+[^\r\n]*)/i,
    // Diagnostic-Code: smtp; 550 User not found
    /Diagnostic-Code:\s*[^;]*;\s*([^\r\n]+)/i,
    // Action: failed
    /Action:\s*(failed[^\r\n]*)/i,
    // Remote-MTA: ... / said: 550 ...
    /said:\s*(\d{3}[^\r\n]*)/i,
    // SMTP error from remote mail server after ...
    /SMTP\s+error[^:]*:\s*([^\r\n]+)/i,
    // The email account that you tried to reach does not exist
    /(The email account[^\r\n.]+)/i,
    // User unknown / mailbox not found
    /((?:user|mailbox|recipient)\s+(?:unknown|not\s+found|does\s+not\s+exist)[^\r\n]*)/i,
    // 550 5.1.1 ...
    /\b(5\d{2}\s+\d+\.\d+\.\d+[^\r\n]*)/i,
  ];

  for (const pattern of patterns) {
    const match = bodyText.match(pattern);
    if (match?.[1]) {
      const reason = match[1].trim();
      if (reason.length > 10 && reason.length < 500) {
        return reason;
      }
    }
  }

  // Fallback: usar snippet si está disponible
  if (snippet && snippet.length > 10) {
    return snippet.slice(0, 200);
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mover mensaje a papelera
// ─────────────────────────────────────────────────────────────────────────────
export async function trashMessage(options: {
  googleAccountId: string;
  messageId: string;
}): Promise<void> {
  const gmail = await getGmailClient(options.googleAccountId);

  await gmail.users.messages.trash({
    userId: "me",
    id: options.messageId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Procesar un mensaje de rebote completo
// ─────────────────────────────────────────────────────────────────────────────
export async function processBounceMessage(options: {
  googleAccountId: string;
  messageId: string;
}): Promise<BounceMessage> {
  const message = await getMessageFull({
    googleAccountId: options.googleAccountId,
    messageId: options.messageId,
  });

  const parsed = extractBouncedEmailAndReason(message);

  return {
    id: options.messageId,
    threadId: message.threadId ?? null,
    bouncedEmail: parsed.bouncedEmail,
    reason: parsed.reason,
    permalink: `https://mail.google.com/mail/u/0/#inbox/${options.messageId}`,
  };
}
