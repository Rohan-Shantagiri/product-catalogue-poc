import type { Middleware, ParameterizedContext } from "koa";
import type { Logger } from "pino";
import { AppError, NotFoundError } from "../../domain/errors.js";
import { presentProblem } from "../presenters.js";
import type { RequestState } from "./request-context.js";

function sendProblem(ctx: ParameterizedContext<RequestState>, error: unknown) {
  const requestId = ctx.state.requestId;
  const problem =
    error instanceof AppError
      ? {
          title: error.message,
          status: error.status,
          code: error.code,
          requestId,
          errors: error.errors,
        }
      : {
          title: "Internal Server Error",
          status: 500,
          code: "INTERNAL_ERROR" as const,
          requestId,
        };

  ctx.status = problem.status;
  ctx.remove("Cache-Control");
  ctx.body = presentProblem(problem);
  ctx.type = "application/problem+json";
}

export function errorHandler(logger: Logger): Middleware<RequestState> {
  return async (ctx, next) => {
    try {
      await next();
      if (
        ctx.status === 404 &&
        (ctx.path === "/api" || ctx.path.startsWith("/api/"))
      ) {
        sendProblem(ctx, new NotFoundError());
      }
    } catch (error) {
      if (!(error instanceof AppError)) {
        logger.error({ reqId: ctx.state.requestId }, "Unhandled request error");
      }
      sendProblem(ctx, error);
    }
  };
}
