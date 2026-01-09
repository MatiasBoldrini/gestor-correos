import crypto from "node:crypto";

export type UnsubscribeTokenPayload = {
  v: 1;
  contactId: string;
  email: string;
  campaignId?: string | null;
  iat: number; // unix seconds
  exp: number; // unix seconds
};

function getUnsubscribeSecret(): string {
  const secret = process.env.UNSUBSCRIBE_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      "Falta configurar UNSUBSCRIBE_TOKEN_SECRET (necesario para generar/verificar tokens de baja)"
    );
  }
  return secret;
}

function base64UrlEncode(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function base64UrlDecodeToBuffer(input: string): Buffer {
  const padLength = (4 - (input.length % 4)) % 4;
  const padded = input.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(padLength);
  return Buffer.from(padded, "base64");
}

function signPayloadBase64(payloadB64: string): string {
  const secret = getUnsubscribeSecret();
  const sig = crypto.createHmac("sha256", secret).update(payloadB64).digest();
  return base64UrlEncode(sig);
}

export function hashUnsubscribeToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createUnsubscribeToken(input: {
  contactId: string;
  email: string;
  campaignId?: string | null;
  ttlSeconds?: number;
}): string {
  // Por defecto lo hacemos “largo” (1 año) para que un email viejo siga funcionando.
  const ttlSeconds = input.ttlSeconds ?? 60 * 60 * 24 * 365;
  const now = Math.floor(Date.now() / 1000);

  const payload: UnsubscribeTokenPayload = {
    v: 1,
    contactId: input.contactId,
    email: input.email,
    campaignId: input.campaignId ?? null,
    iat: now,
    exp: now + ttlSeconds,
  };

  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const sigB64 = signPayloadBase64(payloadB64);
  return `${payloadB64}.${sigB64}`;
}

export function verifyUnsubscribeToken(
  token: string
):
  | { ok: true; payload: UnsubscribeTokenPayload }
  | { ok: false; reason: "invalid" | "expired" } {
  const parts = token.split(".");
  if (parts.length !== 2) return { ok: false, reason: "invalid" };
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return { ok: false, reason: "invalid" };

  let expectedSigB64: string;
  try {
    expectedSigB64 = signPayloadBase64(payloadB64);
  } catch {
    // Secret faltante, etc.
    return { ok: false, reason: "invalid" };
  }

  try {
    const sig = base64UrlDecodeToBuffer(sigB64);
    const expected = base64UrlDecodeToBuffer(expectedSigB64);
    if (sig.length !== expected.length) return { ok: false, reason: "invalid" };
    if (!crypto.timingSafeEqual(sig, expected)) return { ok: false, reason: "invalid" };
  } catch {
    return { ok: false, reason: "invalid" };
  }

  let payload: UnsubscribeTokenPayload;
  try {
    const decoded = base64UrlDecodeToBuffer(payloadB64).toString("utf8");
    payload = JSON.parse(decoded) as UnsubscribeTokenPayload;
  } catch {
    return { ok: false, reason: "invalid" };
  }

  if (
    payload?.v !== 1 ||
    typeof payload.contactId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return { ok: false, reason: "invalid" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp <= now) return { ok: false, reason: "expired" };

  return { ok: true, payload };
}

