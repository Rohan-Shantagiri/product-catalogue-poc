import { describe, expect, it } from "vitest";
import { problemDetailsSchema } from "./index.js";

describe("P2-01: shared problem details contract", () => {
  it("preserves the Phase 1 not-found response", () => {
    const legacy = {
      type: "about:blank",
      title: "Not Found",
      status: 404,
      code: "NOT_FOUND",
      requestId: "phase-one-request",
    };
    expect(problemDetailsSchema.parse(legacy)).toEqual(legacy);
  });

  it.each([
    ["VALIDATION_FAILED", 400],
    ["NOT_FOUND", 404],
    ["PRODUCT_NOT_FOUND", 422],
    ["UNSUPPORTED_MEDIA_TYPE", 415],
    ["PAYLOAD_TOO_LARGE", 413],
    ["RATE_LIMITED", 429],
    ["UPSTREAM_UNAVAILABLE", 502],
    ["EMAIL_DELIVERY_FAILED", 502],
    ["INTERNAL_ERROR", 500],
  ])("accepts the %s code and its HTTP status", (code, status) => {
    const minimal = {
      type: "about:blank",
      title: "Request could not be completed",
      status,
      code,
    };
    expect(problemDetailsSchema.parse(minimal)).toEqual(minimal);
  });

  it("supports a problem type, safe detail, request ID, and field errors", () => {
    const validation = {
      type: "/problems/invalid-request",
      title: "Invalid request",
      status: 400,
      code: "VALIDATION_FAILED",
      detail: "Correct the highlighted fields.",
      requestId: "phase-two-request",
      errors: [{ path: "q", message: "Enter search text" }],
    };
    expect(problemDetailsSchema.parse(validation)).toEqual(validation);
    expect(
      problemDetailsSchema.safeParse({ ...validation, code: "UNKNOWN" })
        .success,
    ).toBe(false);
    expect(
      problemDetailsSchema.safeParse({ ...validation, errors: [{ path: "q" }] })
        .success,
    ).toBe(false);
    expect(
      problemDetailsSchema.safeParse({ ...validation, stack: "private stack" })
        .success,
    ).toBe(false);
  });
});
