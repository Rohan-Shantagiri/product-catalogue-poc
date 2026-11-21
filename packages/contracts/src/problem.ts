import { z } from "zod";

export const errorCodeSchema = z.enum([
  "VALIDATION_FAILED",
  "NOT_FOUND",
  "PRODUCT_NOT_FOUND",
  "UNSUPPORTED_MEDIA_TYPE",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "UPSTREAM_UNAVAILABLE",
  "EMAIL_DELIVERY_FAILED",
  "INTERNAL_ERROR",
]);

export const problemDetailsSchema = z.strictObject({
  type: z.string().min(1),
  title: z.string().min(1),
  status: z.int().min(400).max(599),
  detail: z.string().optional(),
  code: errorCodeSchema,
  requestId: z
    .string()
    .regex(/^[A-Za-z0-9-]{1,64}$/)
    .optional(),
  errors: z
    .array(
      z.strictObject({
        path: z.string(),
        message: z.string().min(1),
      }),
    )
    .optional(),
});

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
