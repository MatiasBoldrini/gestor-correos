import { Receiver } from "@upstash/qstash";

// ─────────────────────────────────────────────────────────────────────────────
// Verificar firma de QStash
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyQStashSignature(options: {
  signature: string;
  body: string;
}): Promise<boolean> {
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;

  if (!currentSigningKey || !nextSigningKey) {
    console.error(
      "QSTASH_CURRENT_SIGNING_KEY y QSTASH_NEXT_SIGNING_KEY son requeridos"
    );
    return false;
  }

  const receiver = new Receiver({
    currentSigningKey,
    nextSigningKey,
  });

  try {
    const isValid = await receiver.verify({
      signature: options.signature,
      body: options.body,
    });

    return isValid;
  } catch (err) {
    console.error("Error al verificar firma de QStash:", err);
    return false;
  }
}
