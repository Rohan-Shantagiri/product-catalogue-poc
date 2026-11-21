import {
  healthResponseSchema,
  problemDetailsSchema,
} from "@catalogue/contracts";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { composeApi } from "../composition-root.js";
import { createLogger } from "../logger.js";

const { app } = composeApi({ LOG_LEVEL: "silent" });

describe("API liveness: GET /api/health", () => {
  it.each(["fakestore", "fixture"])(
    "returns the shared health contract and liveness headers in %s mode",
    async (PRODUCT_SOURCE) => {
      const { app } = composeApi({ PRODUCT_SOURCE, LOG_LEVEL: "silent" });
      const response = await request(app.callback())
        .get("/api/health")
        .set("X-Request-Id", "health-check")
        .expect(200)
        .expect("Content-Type", /application\/json/)
        .expect("Cache-Control", "no-store")
        .expect("X-Content-Type-Options", "nosniff")
        .expect("X-Request-Id", "health-check");

      expect(healthResponseSchema.parse(response.body)).toEqual({
        status: "ok",
      });
    },
  );

  it("returns a safe problem with a generated request ID for unknown API routes", async () => {
    const response = await request(app.callback())
      .get("/api/unknown")
      .set("X-Request-Id", "invalid request id")
      .expect(404)
      .expect("Content-Type", /application\/problem\+json/);

    const problem = problemDetailsSchema.parse(response.body);
    expect(problem.code).toBe("NOT_FOUND");
    expect(problem.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.headers["x-request-id"]).toBe(problem.requestId);
  });
});

describe("P1-03: structured API request logs", () => {
  it("logs one safe route label and skips query and body values", async () => {
    const lines: string[] = [];
    const logger = createLogger("info", {
      write: (line: string) => lines.push(line),
    });
    const { app: loggedApp } = composeApi({}, { logger });
    lines.length = 0;

    await request(loggedApp.callback())
      .post("/api/private-value?query=example-secret")
      .set("X-Request-Id", "request-log-check")
      .send({ body: "sample-private-body" })
      .expect(404);

    expect(lines).toHaveLength(1);
    const entry: unknown = JSON.parse(lines[0] ?? "");
    const elapsedMilliseconds: unknown = expect.any(Number);
    expect(entry).toMatchObject({
      reqId: "request-log-check",
      method: "POST",
      route: "unmatched",
      status: 404,
      durationMs: elapsedMilliseconds,
    });
    expect(lines.join("")).not.toMatch(
      /private-value|example-secret|sample-private-body/,
    );
  });
});
