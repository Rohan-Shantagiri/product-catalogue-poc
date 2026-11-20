import { Router } from "@koa/router";
import { presentHealth } from "../presenters.js";

export const healthPath = "/api/health";

export function createHealthRouter() {
  const router = new Router();
  router.get(healthPath, (ctx) => {
    ctx.set("Cache-Control", "no-store");
    ctx.body = presentHealth();
  });
  return router;
}
