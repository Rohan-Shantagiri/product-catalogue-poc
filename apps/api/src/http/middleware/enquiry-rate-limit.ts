import type { Middleware } from "koa";
import rateLimit from "koa-ratelimit";
import { RateLimitedError } from "../../domain/errors.js";
import type { RequestState } from "./request-context.js";

export type EnquiryLimits = { max: number; windowSeconds: number };

export function enquiryRateLimit({
  max,
  windowSeconds,
}: EnquiryLimits): Middleware<RequestState> {
  return rateLimit({
    driver: "memory",
    db: new Map(),
    duration: windowSeconds * 1_000,
    max,
    id: (ctx) => ctx.ip,
    onLimited: () => {
      throw new RateLimitedError();
    },
  });
}
