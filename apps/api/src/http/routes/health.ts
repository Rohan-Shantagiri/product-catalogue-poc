import { Router } from "@koa/router";
import type { RequestState } from "../middleware/request-context.js";
import { presentHealth } from "../presenters.js";

const healthPath = "/api/health";

export function createHealthRouter() {
  const router = new Router<RequestState>();
  router.get(healthPath, (ctx) => {
    ctx.state.route = healthPath;
    ctx.set("Cache-Control", "no-store");
    ctx.body = presentHealth();
  });
  return router;
}
