import "server-only";
import { env } from "../env";
import { errorContext, logger } from "../observability/logger";

export interface Mail {
  to: string;
  subject: string;
  text: string;
}

export class MailUnavailableError extends Error {
  constructor() {
    super("L'envoi d'e-mails n'est pas configuré sur ce serveur.");
    this.name = "MailUnavailableError";
  }
}

/**
 * Sends transactional e-mails. "console" prints them to the dev server output
 * (development only); "resend" uses the Resend HTTP API; "disabled" refuses.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const config = env();
  if (config.MAIL_TRANSPORT === "console") {
    if (config.NODE_ENV === "production") throw new MailUnavailableError();
    process.stdout.write(`\n[mail:console] À : ${mail.to}\nSujet : ${mail.subject}\n${mail.text}\n\n`);
    return;
  }
  if (config.MAIL_TRANSPORT === "resend" && config.RESEND_API_KEY) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.MAIL_FROM, to: mail.to, subject: mail.subject, text: mail.text }),
    });
    if (!response.ok) {
      logger.error("mail.send_failed", { status: response.status });
      throw new Error("L'e-mail n'a pas pu être envoyé.");
    }
    return;
  }
  logger.warn("mail.transport_disabled", errorContext(new MailUnavailableError()));
  throw new MailUnavailableError();
}
