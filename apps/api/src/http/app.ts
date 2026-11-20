import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import Koa from "koa";
import type { Logger } from "pino";
import { presentProblem } from "./presenters.js";
import { createHealthRouter, healthPath } from "./routes/health.js";

type AppDependencies = { logger: Logger; trustProxy: boolean };

export function createApp({ logger, trustProxy }: AppDependencies) {
  const app = new Koa({ proxy: trustProxy, maxIpsCount: 1 });
  app.silent = true;

  app.use(async (ctx, next) => {
    const startedAt = performance.now();
    const incomingId = ctx.get("X-Request-Id");
    const reqId = /^[A-Za-z0-9-]{1,64}$/.test(incomingId)
      ? incomingId
      : randomUUID();

    ctx.set("X-Request-Id", reqId);
    ctx.set("X-Content-Type-Options", "nosniff");

    try {
      await next();
      if (ctx.status === 404 && ctx.path.startsWith("/api/")) {
        ctx.status = 404;
        ctx.body = presentProblem({
          title: "Not Found",
          status: 404,
          code: "NOT_FOUND",
          requestId: reqId,
        });
        ctx.type = "application/problem+json";
      }
    } catch {
      ctx.status = 500;
      ctx.body = presentProblem({
        title: "Internal Server Error",
        status: 500,
        code: "INTERNAL_ERROR",
        requestId: reqId,
      });
      ctx.type = "application/problem+json";
      logger.error({ reqId }, "Unhandled request error");
    } finally {
      logger.info({
        reqId,
        method: ctx.method,
        route: ctx.path === healthPath ? healthPath : "unmatched",
        status: ctx.status,
        durationMs: Math.round(performance.now() - startedAt),
      });
    }
  });

  const health = createHealthRouter();
  app.use(health.routes());
  return app;
}
