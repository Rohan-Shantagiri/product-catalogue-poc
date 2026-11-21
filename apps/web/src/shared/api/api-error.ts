import type { ErrorCode, ProblemDetails } from "@catalogue/contracts";

type ApiErrorDetails = {
  status: number;
  code: ErrorCode | "NETWORK_ERROR";
  title: string;
  fieldErrors?: ProblemDetails["errors"];
  requestId?: string;
  retryAfterSeconds?: number;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorDetails["code"];
  readonly title: string;
  readonly fieldErrors?: ProblemDetails["errors"];
  readonly requestId?: string;
  readonly retryAfterSeconds?: number;

  constructor(details: ApiErrorDetails) {
    super(details.title);
    this.name = "ApiError";
    this.status = details.status;
    this.code = details.code;
    this.title = details.title;
    this.fieldErrors = details.fieldErrors;
    this.requestId = details.requestId;
    this.retryAfterSeconds = details.retryAfterSeconds;
  }
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}
