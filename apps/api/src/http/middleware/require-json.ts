import type { Middleware } from "koa";
import { UnsupportedMediaTypeError } from "../../domain/errors.js";
import type { RequestState } from "./request-context.js";

export const requireJson: Middleware<RequestState> = async (ctx, next) => {
  const mediaType = ctx
    .get("Content-Type")
    .split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (mediaType !== "application/json") throw new UnsupportedMediaTypeError();
  await next();
};
