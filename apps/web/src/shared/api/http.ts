import { problemDetailsSchema } from "@catalogue/contracts";
import type { ZodType } from "zod";
import { ApiError } from "./api-error";

const apiBasePath = "/api/v1";

function getRetryAfter(response: Response): number | undefined {
  const seconds = response.headers.get("Retry-After");
  if (seconds === null || !/^\d+$/u.test(seconds)) return undefined;

  const parsed = Number(seconds);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

async function executeJson<T>(
  url: string,
  schema: ZodType<T>,
  init: RequestInit,
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json, application/problem+json");

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      title: "Unable to reach the catalogue",
    });
  }

  const mediaType = response.headers
    .get("Content-Type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  let body: unknown;
  if (
    mediaType === "application/json" ||
    mediaType === "application/problem+json"
  ) {
    try {
      body = await response.json();
    } catch (error) {
      if (init.signal?.aborted) throw error;
    }
  }

  const requestId = response.headers.get("X-Request-Id") ?? undefined;
  if (!response.ok) {
    const problem =
      mediaType === "application/problem+json"
        ? problemDetailsSchema.safeParse(body).data
        : undefined;
    throw new ApiError({
      status: response.status,
      code: problem?.code ?? "INTERNAL_ERROR",
      title: problem?.title ?? "Request failed",
      fieldErrors: problem?.errors,
      requestId: problem?.requestId ?? requestId,
      retryAfterSeconds: getRetryAfter(response),
    });
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ApiError({
      status: response.status,
      code: "INTERNAL_ERROR",
      title: "Unexpected response",
      requestId,
    });
  }
  return result.data;
}

export function requestJson<T>(
  path: `/${string}`,
  schema: ZodType<T>,
  init: RequestInit = {},
) {
  return executeJson(apiBasePath + path, schema, init);
}
