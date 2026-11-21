import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";
import type { EmailMessage, EmailSender } from "../../ports/email-sender.js";

type SmtpConfig = {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  password?: string;
};

type MailTransport = { sendMail(options: SendMailOptions): Promise<unknown> };

export class SmtpEmailSender implements EmailSender {
  constructor(private readonly transport: MailTransport) {}

  static fromConfig({ host, port, secure, user, password }: SmtpConfig) {
    const smtp = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user === undefined ? undefined : { user, pass: password ?? "" },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
    return new SmtpEmailSender({
      async sendMail(options) {
        const receipt = await smtp.sendMail(options);
        if (receipt.accepted.length === 0)
          throw new Error("SMTP accepted no recipient");
      },
    });
  }

  async send({
    from,
    to,
    replyTo,
    subject,
    text,
  }: EmailMessage): Promise<void> {
    await this.transport.sendMail({ from, to, replyTo, subject, text });
  }
}
