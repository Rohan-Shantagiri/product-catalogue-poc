import { z } from "zod";

export const problemDetailsSchema = z.strictObject({
  type: z.literal("about:blank"),
  title: z.string(),
  status: z.number().int().min(400).max(599),
  code: z.enum(["NOT_FOUND", "INTERNAL_ERROR"]),
  requestId: z.string(),
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;
