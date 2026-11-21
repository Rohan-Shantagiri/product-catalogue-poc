import Koa from "koa";
import type { Logger } from "pino";
import type { CatalogueService } from "../services/catalogue-service.js";
import { errorHandler } from "./middleware/error-handler.js";
import { requestContext } from "./middleware/request-context.js";
import type { RequestState } from "./middleware/request-context.js";
import { createCatalogueRouter } from "./routes/catalogue.js";
import { createHealthRouter } from "./routes/health.js";

type AppDependencies = {
  logger: Logger;
  trustProxy: boolean;
  catalogue: CatalogueService;
};

export function createApp({ logger, trustProxy, catalogue }: AppDependencies) {
  const app = new Koa<RequestState>({ proxy: trustProxy, maxIpsCount: 1 });
  app.silent = true;

  app.use(requestContext(logger));
  app.use(errorHandler(logger));
  app.use(createHealthRouter().routes());
  app.use(createCatalogueRouter(catalogue).routes());
  return app;
}
