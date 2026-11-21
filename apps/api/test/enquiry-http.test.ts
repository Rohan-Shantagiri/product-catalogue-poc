import {
  enquiryAcceptedResponseSchema,
  problemDetailsSchema,
} from "@catalogue/contracts";
import supertest from "supertest";
import type { Response } from "supertest";
import { describe, expect, it, vi } from "vitest";
import { composeApi } from "../src/composition-root.js";
import { createLogger } from "../src/logger.js";
import type { EmailMessage } from "../src/ports/email-sender.js";

const path = "/api/v1/enquiries";
const requestBody = {
  productId: "3",
  name: "Example Customer",
  email: "customer@example.com",
  message: "Is the jacket available?",
};

function start(
  env: NodeJS.ProcessEnv = {},
  sendEmail: (message: EmailMessage) => Promise<void> = () => Promise.resolve(),
) {
  const lines: string[] = [];
  const logger = createLogger("info", { write: (line) => lines.push(line) });
  const send = vi.fn(sendEmail);
  const { app } = composeApi(
    { PRODUCT_SOURCE: "fixture", ...env },
    { emailSender: { send }, logger },
  );
  return { api: supertest(app.callback()), send, lines };
}

function problem(response: Response, code: string) {
  expect(response.type).toBe("application/problem+json");
  const parsed = problemDetailsSchema.parse(response.body);
  expect(parsed.code).toBe(code);
  expect(parsed.status).toBe(response.status);
  expect(parsed.requestId).toBe(response.headers["x-request-id"]);
  return parsed;
}

describe("P3-04: POST /api/v1/enquiries sends only valid JSON", () => {
  it("returns a 202 with no-store and sends the actual product details without logging customer data", async () => {
    const { api, send, lines } = start();
    const result = await api
      .post(path)
      .send(requestBody)
      .set("X-Request-Id", "phase-three-accepted")
      .expect(202)
      .expect("Cache-Control", "no-store")
      .expect("X-Content-Type-Options", "nosniff");
    const { enquiryId } = enquiryAcceptedResponseSchema.parse(result.body);
    const [first] = send.mock.calls;
    expect(send).toHaveBeenCalledTimes(1);
    expect(first?.[0].subject).toContain(`[ref ${enquiryId.slice(0, 8)}]`);
    expect(first?.[0].text).toContain("(ID 3)");
    expect(first?.[0].to).toBe("sales@example.com");
    expect(first?.[0].from).toBe("enquiries@example.com");
    const log = lines.join("");
    expect(log).toContain('"event":"enquiry.accepted"');
    expect(log).toContain(`"enquiryId":"${enquiryId}"`);
    expect(log).not.toMatch(
      /Example Customer|customer@example.com|Is the jacket available/,
    );
  });

  it.each([
    "text/plain",
    "application/x-www-form-urlencoded",
    "application/xml",
  ])("rejects %s with 415", async (contentType) => {
    const { api, send } = start();
    const result = await api
      .post(path)
      .set("Content-Type", contentType)
      .send("example")
      .expect(415);
    problem(result, "UNSUPPORTED_MEDIA_TYPE");
    expect(send).not.toHaveBeenCalled();
  });

  it("accepts a JSON media type with a charset parameter", async () => {
    const { api } = start();
    const result = await api
      .post(path)
      .set("Content-Type", "application/json; charset=utf-8")
      .send(JSON.stringify(requestBody))
      .expect(202);
    enquiryAcceptedResponseSchema.parse(result.body);
  });

  it("returns 400 for malformed JSON and 413 for an oversized JSON body", async () => {
    const { api, send } = start();
    const invalid = await api
      .post(path)
      .set("Content-Type", "application/json")
      .send("{bad")
      .expect(400);
    problem(invalid, "VALIDATION_FAILED");
    const tooLarge = await api
      .post(path)
      .send({ ...requestBody, message: "x".repeat(11000) })
      .expect(413);
    problem(tooLarge, "PAYLOAD_TOO_LARGE");
    expect(send).not.toHaveBeenCalled();
  });

  it("rejects invalid fields and client-supplied product properties with 400", async () => {
    const { api, send } = start();
    const invalid = await api
      .post(path)
      .send({ ...requestBody, name: "", email: "invalid" })
      .expect(400);
    expect(
      problem(invalid, "VALIDATION_FAILED").errors?.map(({ path }) => path),
    ).toEqual(["name", "email"]);
    const forged = await api
      .post(path)
      .send({ ...requestBody, title: "Client title", price: 1 })
      .expect(400);
    problem(forged, "VALIDATION_FAILED");
    expect(send).not.toHaveBeenCalled();
  });

  it("returns a 422 and sends no email when the product does not exist", async () => {
    const { api, send } = start();
    const result = await api
      .post(path)
      .send({ ...requestBody, productId: "missing" })
      .expect(422);
    problem(result, "PRODUCT_NOT_FOUND");
    expect(send).not.toHaveBeenCalled();
  });

  it("maps relay failure to 502 without returning or logging transport details", async () => {
    const { api, lines } = start({}, () =>
      Promise.reject(new Error("Private relay detail")),
    );
    const result = await api.post(path).send(requestBody).expect(502);
    problem(result, "EMAIL_DELIVERY_FAILED");
    expect(result.text).not.toContain("Private relay detail");
    expect(lines.join("")).toContain('"event":"enquiry.failed"');
    expect(lines.join("")).not.toMatch(
      /Private relay detail|customer@example.com/,
    );
  });
});

describe("P3-04: per-IP enquiry rate limit", () => {
  it("allows five sends, then returns 429 with Retry-After for the same IP", async () => {
    const { api, send } = start({ TRUST_PROXY: "true" });
    for (let attempt = 0; attempt < 5; attempt++) {
      const accepted = await api
        .post(path)
        .set("X-Forwarded-For", "203.0.113.11")
        .send(requestBody)
        .expect(202);
      enquiryAcceptedResponseSchema.parse(accepted.body);
    }
    const limited = await api
      .post(path)
      .set("X-Forwarded-For", "203.0.113.99, 203.0.113.11")
      .send(requestBody)
      .expect(429)
      .expect("Retry-After", /^\d+$/);
    const retryAfter = Number(limited.headers["retry-after"]);
    expect(retryAfter).toBeGreaterThan(590);
    expect(retryAfter).toBeLessThanOrEqual(600);
    problem(limited, "RATE_LIMITED");
    expect(send).toHaveBeenCalledTimes(5);
    const other = await api
      .post(path)
      .set("X-Forwarded-For", "203.0.113.12")
      .send(requestBody)
      .expect(202);
    enquiryAcceptedResponseSchema.parse(other.body);
    expect(send).toHaveBeenCalledTimes(6);
  });
});
