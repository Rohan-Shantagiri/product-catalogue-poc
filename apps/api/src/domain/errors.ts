type ErrorCode = "NOT_FOUND" | "VALIDATION_FAILED" | "UPSTREAM_UNAVAILABLE";

export type FieldError = { path: string; message: string };

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    title: string,
    readonly errors?: FieldError[],
  ) {
    super(title);
  }
}

export class NotFoundError extends AppError {
  constructor() {
    super(404, "NOT_FOUND", "Not Found");
  }
}

export class ValidationError extends AppError {
  constructor(errors: FieldError[]) {
    super(400, "VALIDATION_FAILED", "Bad Request", errors);
  }
}

export class UpstreamUnavailableError extends AppError {
  constructor() {
    super(502, "UPSTREAM_UNAVAILABLE", "Upstream Unavailable");
  }
}
