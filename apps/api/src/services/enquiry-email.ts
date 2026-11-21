import type { Enquiry } from "../domain/enquiry.js";
import type { Money } from "../domain/product.js";
import type { EmailMessage } from "../ports/email-sender.js";

export type EnquiryEmailConfig = {
  to: string;
  from: string;
  webBaseUrl: string;
};

function singleLine(text: string): string {
  return text.replace(/[\r\n]+/gu, " ").trim();
}

function subjectFor(enquiry: Enquiry): string {
  const prefix = "New enquiry: ";
  const reference = ` [ref ${enquiry.id.slice(0, 8)}]`;
  const available = 150 - prefix.length - reference.length;
  const title = singleLine(enquiry.product.title)
    .slice(0, available)
    .replace(/[\uD800-\uDBFF]$/u, "")
    .trimEnd();
  return prefix + title + reference;
}

function priceFor({ amountCents, currency }: Money): string {
  const formatted = new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountCents / 100);
  return currency === "AUD" ? `A${formatted}` : formatted;
}

export function composeEnquiryEmail(
  enquiry: Enquiry,
  config: EnquiryEmailConfig,
): EmailMessage {
  const { id, customer, product, receivedAt } = enquiry;
  const link = new URL(config.webBaseUrl);
  link.pathname =
    link.pathname.replace(/\/+$/u, "") +
    "/products/" +
    encodeURIComponent(product.id);
  link.search = "";
  link.hash = "";

  const name = singleLine(customer.name).replace(/["\\]/gu, "\\$&");
  const replyTo = `"${name}" <${customer.email}>`;

  return {
    to: config.to,
    from: config.from,
    replyTo,
    subject: subjectFor(enquiry),
    text: [
      "New product enquiry",
      "",
      `Reference: ${id}`,
      `Received: ${receivedAt.toISOString()}`,
      "",
      `Product: ${product.title} (ID ${product.id})`,
      `Price: ${priceFor(product.price)}`,
      `Link: ${link.href}`,
      "",
      `Name: ${customer.name}`,
      `Email: ${customer.email}`,
      `Phone: ${customer.phone || "not provided"}`,
      "",
      "Message:",
      customer.message || "not provided",
    ].join("\n"),
  };
}
