import {
  healthResponseSchema,
  problemDetailsSchema,
} from "@catalogue/contracts";
import type { ProblemDetails } from "@catalogue/contracts";

export function presentHealth() {
  return healthResponseSchema.parse({ status: "ok" });
}

export function presentProblem(
  problem: Pick<ProblemDetails, "title" | "status" | "code" | "requestId">,
) {
  return problemDetailsSchema.parse({ type: "about:blank", ...problem });
}
