import {
  hashUnsubscribeToken,
  verifyUnsubscribeToken,
} from "@/server/domain/unsubscribe-token";
import {
  getContactForUnsubscribe,
  setContactUnsubscribed,
} from "@/server/integrations/db/contacts-repo";
import {
  hasUnsubscribeEventByTokenHash,
  insertUnsubscribeEvent,
} from "@/server/integrations/db/unsubscribe-events-repo";

export type UnsubscribeResult = {
  contactId: string;
  alreadyUnsubscribed: boolean;
};

export class UnsubscribeError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_token"
      | "expired_token"
      | "contact_not_found"
      | "token_contact_mismatch"
  ) {
    super(message);
    this.name = "UnsubscribeError";
  }
}

export async function unsubscribeByToken(token: string): Promise<UnsubscribeResult> {
  const verified = verifyUnsubscribeToken(token);
  if (!verified.ok) {
    if (verified.reason === "expired") {
      throw new UnsubscribeError("El link de baja expiró", "expired_token");
    }
    throw new UnsubscribeError("Link de baja inválido", "invalid_token");
  }

  const { contactId, email, campaignId } = verified.payload;

  const contact = await getContactForUnsubscribe(contactId);
  if (!contact) {
    throw new UnsubscribeError("Contacto no encontrado", "contact_not_found");
  }

  // Defensa extra: el token debe corresponder al email real del contacto.
  if (contact.email.toLowerCase() !== email.toLowerCase()) {
    throw new UnsubscribeError("Link de baja inválido", "token_contact_mismatch");
  }

  const alreadyUnsubscribed = contact.subscriptionStatus === "unsubscribed";

  // Idempotente: siempre dejamos el estado en unsubscribed.
  await setContactUnsubscribed(contactId);

  const tokenHash = hashUnsubscribeToken(token);
  const alreadyLogged = await hasUnsubscribeEventByTokenHash(tokenHash);
  if (!alreadyLogged) {
    await insertUnsubscribeEvent({
      contactId,
      campaignId: campaignId ?? null,
      tokenHash,
    });
  }

  return { contactId, alreadyUnsubscribed };
}

