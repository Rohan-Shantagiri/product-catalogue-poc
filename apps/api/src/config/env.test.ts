import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { describe, expect, it } from "vitest";
import { envSchema, loadEnv } from "./env.js";

describe("API configuration: validated defaults and overrides", () => {
  it("treats empty values as unset and parses false as false", () => {
    expect(
      loadEnv({ PORT: "", TRUST_PROXY: "false", SMTP_SECURE: "true" }),
    ).toMatchObject({
      PORT: 3000,
      TRUST_PROXY: false,
      SMTP_SECURE: true,
    });
  });

  it("validates and converts values provided by the operator", () => {
    expect(
      loadEnv({
        PORT: "4300",
        HOST: "127.0.0.1",
        TRUST_PROXY: "true",
        SMTP_PORT: "11025",
        SMTP_SECURE: "false",
        PRODUCT_SOURCE: "fixture",
        IMAGE_ALLOWED_HOSTS: "Example.com, Images.Example.com",
      }),
    ).toMatchObject({
      PORT: 4300,
      HOST: "127.0.0.1",
      TRUST_PROXY: true,
      SMTP_PORT: 11025,
      SMTP_SECURE: false,
      PRODUCT_SOURCE: "fixture",
      IMAGE_ALLOWED_HOSTS: ["example.com", "images.example.com"],
    });
  });

  it("reports invalid field names without echoing values", () => {
    expect(() => loadEnv({ TRUST_PROXY: "yes", PORT: "-1" })).toThrow(
      "Invalid API environment variables: PORT, TRUST_PROXY",
    );
  });

  it("documents every API variable and the Compose-only port mappings", () => {
    const example = parseEnv(
      readFileSync(
        new URL("../../../../.env.example", import.meta.url),
        "utf8",
      ),
    );
    expect(Object.keys(example).sort()).toEqual(
      [
        ...Object.keys(envSchema.shape),
        "WEB_PORT",
        "API_PORT",
        "MAILPIT_UI_PORT",
      ].sort(),
    );
    expect(loadEnv(example)).toEqual(loadEnv({}));
  });
});
