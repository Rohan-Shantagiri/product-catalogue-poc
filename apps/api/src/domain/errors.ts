type ErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_FAILED"
  | "UPSTREAM_UNAVAILABLE"
  | "PRODUCT_NOT_FOUND"
  | "UNSUPPORTED_MEDIA_TYPE"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "EMAIL_DELIVERY_FAILED";

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

export class ProductNotFoundError extends AppError {
  constructor() {
    super(422, "PRODUCT_NOT_FOUND", "Product Not Found");
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor() {
    super(415, "UNSUPPORTED_MEDIA_TYPE", "Unsupported Media Type");
  }
}

export class PayloadTooLargeError extends AppError {
  constructor() {
    super(413, "PAYLOAD_TOO_LARGE", "Payload Too Large");
  }
}

export class RateLimitedError extends AppError {
  constructor() {
    super(429, "RATE_LIMITED", "Too Many Requests");
  }
}

export class EmailDeliveryError extends AppError {
  constructor() {
    super(502, "EMAIL_DELIVERY_FAILED", "Email Delivery Failed");
  }
}
