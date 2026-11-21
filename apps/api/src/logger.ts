import { pino } from "pino";
import type { DestinationStream } from "pino";
import type { AppEnv } from "./config/env.js";

export function createLogger(
  level: AppEnv["LOG_LEVEL"],
  destination?: DestinationStream,
) {
  return pino(
    {
      level,
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "*.customer",
        "*.email",
        "*.phone",
      ],
    },
    destination,
  );
}
