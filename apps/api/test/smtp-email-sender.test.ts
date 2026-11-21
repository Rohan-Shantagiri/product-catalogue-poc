import nodemailer from "nodemailer";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SmtpEmailSender } from "../src/adapters/email/smtp-email-sender.js";

const mail = {
  from: "enquiries@example.com",
  to: "sales@example.com",
  replyTo: '"Example Customer" <customer@example.com>',
  subject: "New enquiry: Canvas jacket [ref 56aa30c8]",
  text: "Message:\nExample <b>plain text</b>.",
};

describe("P3-03: SMTP adapter serializes the actual composed message", () => {
  it("uses Nodemailer's JSON transport offline to inspect headers and plain text", async () => {
    const transport = nodemailer.createTransport({ jsonTransport: true });
    let serialized: unknown;
    const sender = new SmtpEmailSender({
      async sendMail(message) {
        const result = await transport.sendMail(message);
        serialized = result.message;
      },
    });

    await sender.send(mail);
    const payload: unknown = JSON.parse(z.string().parse(serialized));
    const address = z.object({ address: z.string(), name: z.string() });
    const composed = z
      .object({
        to: z.array(address),
        from: address,
        replyTo: z.array(address),
        subject: z.string(),
        text: z.string(),
      })
      .parse(payload);
    expect(composed.to.map(({ address }) => address)).toEqual([mail.to]);
    expect(composed.from.address).toBe(mail.from);
    expect(composed.replyTo).toEqual([
      { address: "customer@example.com", name: "Example Customer" },
    ]);
    expect(composed.subject).toBe(mail.subject);
    expect(composed.text).toBe(mail.text);
    expect(payload).not.toHaveProperty("html");
  });

  it("propagates a transport rejection to the service", async () => {
    const sender = new SmtpEmailSender({
      sendMail: () => Promise.reject(new Error("Relay unavailable")),
    });
    await expect(sender.send(mail)).rejects.toThrow("Relay unavailable");
  });
});
