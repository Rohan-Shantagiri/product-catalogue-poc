import { describe, expect, it, vi } from "vitest";
import {
  EmailDeliveryError,
  ProductNotFoundError,
} from "../src/domain/errors.js";
import { composeEnquiryEmail } from "../src/services/enquiry-email.js";
import { EnquiryService } from "../src/services/enquiry-service.js";
import type { EmailMessage } from "../src/ports/email-sender.js";
import { makeProduct } from "./make-product.js";

const enquiryId = "56aa30c8-2196-4e2f-bff6-600b6edfa03b";
const receivedAt = new Date("2026-11-21T04:30:00.000Z");
const emailConfig = {
  to: "sales@example.com",
  from: "enquiries@example.com",
  webBaseUrl: "https://catalogue.example.com/shop/",
};
const customer = {
  name: 'Example "Customer"',
  email: "customer@example.com",
  phone: "+61 1234-5678",
  message: "Hello <b>sales</b>!",
};
const product = makeProduct("SKU_A-2", { title: "Canvas jacket" });
const enquiry = { id: enquiryId, receivedAt, product, customer };

describe("P3-03: compose the plain-text sales enquiry", () => {
  it("uses a fixed sender, a quoted reply-to, catalogue price and product link", () => {
    const email = composeEnquiryEmail(enquiry, emailConfig);
    expect(email).toMatchObject({
      to: emailConfig.to,
      from: emailConfig.from,
      replyTo: '"Example \\"Customer\\"" <customer@example.com>',
      subject: "New enquiry: Canvas jacket [ref 56aa30c8]",
    });
    for (const line of [
      "New product enquiry",
      `Reference: ${enquiryId}`,
      "Received: 2026-11-21T04:30:00.000Z",
      "Product: Canvas jacket (ID SKU_A-2)",
      "Price: A$109.95",
      "Link: https://catalogue.example.com/shop/products/SKU_A-2",
      'Name: Example "Customer"',
      "Email: customer@example.com",
      "Phone: +61 1234-5678",
      "Message:\nHello <b>sales</b>!",
    ]) {
      expect(email.text).toContain(line);
    }
    expect(email).not.toHaveProperty("html");
  });

  it("removes line breaks from headers, keeps the reference, and prints missing details", () => {
    const email = composeEnquiryEmail(
      {
        ...enquiry,
        product: { ...product, title: "Long title\r\n" + "🧥".repeat(100) },
        customer: {
          email: customer.email,
          name: "Example\r\nCustomer",
          message: "",
        },
      },
      emailConfig,
    );

    expect(email.subject).not.toMatch(/[\r\n]/);
    expect(email.subject.length).toBeLessThanOrEqual(150);
    expect(email.subject).toMatch(/\[ref 56aa30c8\]$/);
    expect(email.subject).not.toMatch(/[\uD800-\uDBFF](?= )/u);
    expect(email.replyTo).toBe('"Example Customer" <customer@example.com>');
    expect(email.text).toContain("Phone: not provided");
    expect(email.text).toContain("Message:\nnot provided");
  });
});

function makeService(
  options: {
    missing?: boolean;
    send?: (message: EmailMessage) => Promise<void>;
  } = {},
) {
  const getById = vi.fn().mockResolvedValue(options.missing ? null : product);
  const send = vi.fn(options.send ?? (() => Promise.resolve()));
  const report = vi.fn();
  const createId = vi.fn(() => enquiryId);
  const service = new EnquiryService({
    products: { getById },
    emails: { send },
    emailConfig,
    clock: () => receivedAt,
    createId,
    report,
  });
  return { service, getById, send, report, createId };
}

function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = () => done();
  });
  return { promise, resolve };
}
describe("P3-02: accept only after the mail relay accepts", () => {
  it("waits for the send, returns the reference and logs only safe identifiers", async () => {
    const sending = deferred();
    const started = deferred();
    const { service, getById, send, report } = makeService({
      send: () => {
        started.resolve();
        return sending.promise;
      },
    });
    const result = service.submit({ productId: product.id, ...customer });
    await started.promise;
    expect(getById).toHaveBeenCalledExactlyOnceWith(product.id);
    expect(send).toHaveBeenCalledExactlyOnceWith(
      composeEnquiryEmail(enquiry, emailConfig),
    );
    expect(report).not.toHaveBeenCalled();

    sending.resolve();
    expect(await result).toEqual({ enquiryId });
    expect(report).toHaveBeenCalledExactlyOnceWith({
      type: "enquiry.accepted",
      enquiryId,
      productId: product.id,
    });
  });

  it("does not generate a reference or send an email for a missing product", async () => {
    const { service, send, report, createId } = makeService({ missing: true });
    await expect(
      service.submit({ productId: product.id, ...customer }),
    ).rejects.toBeInstanceOf(ProductNotFoundError);
    expect(send).not.toHaveBeenCalled();
    expect(createId).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it("maps a rejected send to a safe error and logs only the identifiers", async () => {
    const { service, report } = makeService({
      send: () => Promise.reject(new Error("Internal relay detail")),
    });
    await expect(
      service.submit({ productId: product.id, ...customer }),
    ).rejects.toBeInstanceOf(EmailDeliveryError);
    expect(report).toHaveBeenCalledExactlyOnceWith({
      type: "enquiry.failed",
      enquiryId,
      productId: product.id,
    });
  });
});
