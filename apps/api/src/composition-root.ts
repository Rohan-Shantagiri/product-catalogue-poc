import { loadEnv } from "./config/env.js";
import { createApp } from "./http/app.js";
import { createLogger } from "./logger.js";

export function composeApi(input: NodeJS.ProcessEnv) {
  const env = loadEnv(input);
  const logger = createLogger(env.LOG_LEVEL);
  const app = createApp({ logger, trustProxy: env.TRUST_PROXY });
  return { app, env, logger };
}
