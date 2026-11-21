import { composeApi } from "./composition-root.js";

const { app, env, logger } = composeApi(process.env);
const server = app.listen(env.PORT, env.HOST, () => {
  logger.info({ port: env.PORT }, "API listening");
});

server.once("error", (error: NodeJS.ErrnoException) => {
  logger.fatal({ code: error.code }, "API listener failed");
  process.exitCode = 1;
});

let shuttingDown = false;

function shutdown(signal: NodeJS.Signals) {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "API shutting down");

  const deadline = setTimeout(() => {
    logger.error("API shutdown timed out");
    process.exit(1);
  }, 10_000);
  deadline.unref();

  server.close((error) => {
    clearTimeout(deadline);
    if (error) {
      logger.error({ name: error.name }, "API shutdown failed");
      process.exitCode = 1;
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
