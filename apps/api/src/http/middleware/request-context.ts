import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { Middleware } from "koa";
import type { Logger } from "pino";

export type RequestState = {
  requestId: string;
  route?: string;
};

export function requestContext(logger: Logger): Middleware<RequestState> {
  return async (ctx, next) => {
    const startedAt = performance.now();
    const incomingId = ctx.get("X-Request-Id");
    const reqId = /^[A-Za-z0-9-]{1,64}$/.test(incomingId)
      ? incomingId
      : randomUUID();

    ctx.state.requestId = reqId;
    ctx.set("X-Request-Id", reqId);
    ctx.set("X-Content-Type-Options", "nosniff");

    try {
      await next();
    } finally {
      logger.info({
        reqId,
        method: ctx.method,
        route: ctx.state.route ?? "unmatched",
        status: ctx.status,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  };
}
