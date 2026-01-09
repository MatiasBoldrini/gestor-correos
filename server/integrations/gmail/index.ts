export { getGmailClient, getSenderEmail } from "./client";
export { sendEmail, addLabelToMessage, type SendEmailResult } from "./send";
export {
  listBounceMessageIds,
  getMessageFull,
  extractBouncedEmailAndReason,
  trashMessage,
  processBounceMessage,
  type ParsedBounce,
  type BounceMessage,
} from "./bounces";
