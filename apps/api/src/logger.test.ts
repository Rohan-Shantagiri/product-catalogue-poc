import { describe, expect, it } from "vitest";
import { createLogger } from "./logger.js";

describe("P1-03: API log redaction", () => {
  it("writes a JSON log with credentials and customer fields redacted", () => {
    const lines: string[] = [];
    const logger = createLogger("info", {
      write: (line: string) => lines.push(line),
    });
    logger.info(
      {
        req: {
          headers: { authorization: "test-token", cookie: "session=test" },
        },
        enquiry: {
          customer: { name: "Example Customer" },
          email: "customer@example.com",
          phone: "test-phone",
        },
      },
      "Test record",
    );

    expect(lines).toHaveLength(1);
    const entry: unknown = JSON.parse(lines[0] ?? "");
    expect(entry).toMatchObject({
      req: { headers: { authorization: "[Redacted]", cookie: "[Redacted]" } },
      enquiry: {
        customer: "[Redacted]",
        email: "[Redacted]",
        phone: "[Redacted]",
      },
      msg: "Test record",
    });
  });
});
