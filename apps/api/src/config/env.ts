import { z } from "zod";

const port = z.coerce.number().int().min(1).max(65535);
const booleanFromEnv = z
  .enum(["true", "false"])
  .transform((value) => value === "true");
const httpUrl = z.url({ protocol: /^https?$/ });

export const envSchema = z.object({
  PORT: port.prefault("3000"),
  HOST: z.string().trim().min(1).default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  TRUST_PROXY: booleanFromEnv.prefault("false"),
  PRODUCT_SOURCE: z.enum(["fakestore", "fixture"]).default("fakestore"),
  FAKESTORE_BASE_URL: httpUrl.default("https://fakestoreapi.com"),
  UPSTREAM_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(100)
    .max(30000)
    .default(5000),
  CATALOGUE_CACHE_TTL_SECONDS: z.coerce
    .number()
    .int()
    .nonnegative()
    .default(300),
  CATALOGUE_CURRENCY: z
    .string()
    .regex(/^[A-Z]{3}$/)
    .default("AUD"),
  IMAGE_ALLOWED_HOSTS: z
    .string()
    .transform((value) =>
      value.split(",").map((host) => host.trim().toLowerCase()),
    )
    .pipe(z.array(z.hostname()).min(1))
    .prefault("fakestoreapi.com"),
  MERCHANDISING_FILE: z
    .string()
    .trim()
    .min(1)
    .default("config/merchandising.json"),
  SMTP_HOST: z.string().trim().min(1).default("localhost"),
  SMTP_PORT: port.prefault("1025"),
  SMTP_SECURE: booleanFromEnv.prefault("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SALES_INBOX_EMAIL: z.email().default("sales@example.com"),
  ENQUIRY_FROM_EMAIL: z.email().default("enquiries@example.com"),
  PUBLIC_WEB_URL: httpUrl.default("http://localhost:5173"),
  ENQUIRY_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5),
  ENQUIRY_RATE_LIMIT_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(600),
});

export type AppEnv = z.infer<typeof envSchema>;

export function loadEnv(input: NodeJS.ProcessEnv): AppEnv {
  const values = Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== ""),
  );
  const result = envSchema.safeParse(values);

  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join("."));
    throw new Error(`Invalid API environment variables: ${fields.join(", ")}`);
  }

  return result.data;
}
