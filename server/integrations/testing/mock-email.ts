import { createHash } from "node:crypto";
import type {
  BounceMessage,
  BounceScanner,
  EmailSender,
  SendEmailInput,
  SendEmailResult,
} from "@/server/integrations/email/types";
import { loadE2EFixture } from "./fixtures-loader";

type BounceFixtureMessage = {
  id: string;
  threadId: string | null;
  bouncedEmail: string | null;
  reason: string | null;
  permalink: string | null;
  inTrash?: boolean;
};

type BounceFixture = {
  messages: BounceFixtureMessage[];
};

const FALLBACK_BOUNCES: BounceFixture = {
  messages: [
    {
      id: "mock-bounce-001",
      threadId: "mock-thread-001",
      bouncedEmail: "rebotado1@example.com",
      reason: "550 5.1.1 User unknown",
      permalink: "https://mail.google.com/mail/u/0/#inbox/mock-bounce-001",
      inTrash: false,
    },
    {
      id: "mock-bounce-trash-001",
      threadId: "mock-thread-002",
      bouncedEmail: "rebotado-trash@example.com",
      reason: "550 5.1.1 Mailbox not found",
      permalink: "https://mail.google.com/mail/u/0/#inbox/mock-bounce-trash-001",
      inTrash: true,
    },
  ],
};

async function getBounceFixture(): Promise<BounceFixture> {
  try {
    return await loadE2EFixture<BounceFixture>("bounces/messages.json");
  } catch {
    return FALLBACK_BOUNCES;
  }
}

function buildDeterministicId(prefix: string, input: string): string {
  const hash = createHash("sha1").update(input).digest("hex").slice(0, 16);
  return `${prefix}-${hash}`;
}

export class DeterministicMockEmailSender implements EmailSender {
  constructor(private readonly senderEmail: string) {}

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const signature = `${input.to}|${input.subject}|${this.senderEmail}`;
    const messageId = buildDeterministicId("mock-msg", signature);
    const threadId = buildDeterministicId("mock-thread", signature);

    return {
      messageId,
      threadId,
      permalink: `https://mail.google.com/mail/u/0/#inbox/${messageId}`,
    };
  }

  getSenderEmail(): string {
    return this.senderEmail;
  }
}

export class DeterministicMockBounceScanner implements BounceScanner {
  async listBounceMessageIds(options: {
    maxResults: number;
    newerThanDays: number;
  }): Promise<string[]> {
    const fixture = await getBounceFixture();
    return fixture.messages.slice(0, options.maxResults).map((m) => m.id);
  }

  async listBounceMessageIdsInTrash(options: {
    maxResults: number;
    newerThanDays: number;
    pageToken?: string;
  }): Promise<{ messageIds: string[]; nextPageToken: string | null }> {
    const fixture = await getBounceFixture();
    const trashMessages = fixture.messages.filter((m) => m.inTrash);

    const startOffset = options.pageToken ? Number.parseInt(options.pageToken, 10) : 0;
    const safeOffset = Number.isFinite(startOffset) ? Math.max(0, startOffset) : 0;
    const page = trashMessages.slice(safeOffset, safeOffset + options.maxResults);
    const nextOffset = safeOffset + page.length;

    return {
      messageIds: page.map((m) => m.id),
      nextPageToken: nextOffset < trashMessages.length ? String(nextOffset) : null,
    };
  }

  async processBounceMessage(messageId: string): Promise<BounceMessage> {
    const fixture = await getBounceFixture();
    const message = fixture.messages.find((m) => m.id === messageId);

    if (!message) {
      return {
        id: messageId,
        threadId: null,
        bouncedEmail: null,
        reason: "Mock bounce no encontrado",
        permalink: null,
      };
    }

    return {
      id: message.id,
      threadId: message.threadId,
      bouncedEmail: message.bouncedEmail,
      reason: message.reason,
      permalink: message.permalink,
    };
  }

  async getMessageForBounceExtraction(messageId: string): Promise<{
    bouncedEmail: string | null;
    reason: string | null;
  }> {
    const message = await this.processBounceMessage(messageId);
    return {
      bouncedEmail: message.bouncedEmail,
      reason: message.reason,
    };
  }

  async trashMessage(messageId: string): Promise<void> {
    void messageId;
    // No-op intencional para modo mock.
  }
}
