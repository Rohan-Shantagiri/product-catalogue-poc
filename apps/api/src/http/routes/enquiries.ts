import { enquiryRequestSchema } from "@catalogue/contracts";
import { bodyParser } from "@koa/bodyparser";
import { Router } from "@koa/router";
import { PayloadTooLargeError, ValidationError } from "../../domain/errors.js";
import type { EnquiryService } from "../../services/enquiry-service.js";
import { enquiryRateLimit } from "../middleware/enquiry-rate-limit.js";
import type { EnquiryLimits } from "../middleware/enquiry-rate-limit.js";
import type { RequestState } from "../middleware/request-context.js";
import { requireJson } from "../middleware/require-json.js";
import { presentEnquiryAccepted } from "../presenters.js";

const enquiryPath = "/api/v1/enquiries";

export function createEnquiriesRouter(
  enquiries: EnquiryService,
  limits: EnquiryLimits,
) {
  const router = new Router<RequestState>();
  const parseJson = bodyParser({
    enableTypes: ["json"],
    parsedMethods: ["POST"],
    jsonLimit: "10kb",
    onError(error) {
      if ("status" in error && error.status === 413)
        throw new PayloadTooLargeError();
      throw new ValidationError([
        { path: "", message: "Send a valid JSON request body." },
      ]);
    },
  });

  router.post(
    enquiryPath,
    async (ctx, next) => {
      ctx.state.route = enquiryPath;
      await next();
    },
    requireJson,
    enquiryRateLimit(limits),
    parseJson,
    async (ctx) => {
      const request = enquiryRequestSchema.safeParse(ctx.request.body);
      if (!request.success) {
        throw new ValidationError(
          request.error.issues.map((issue) => ({
            path: issue.path.map(String).join("."),
            message:
              issue.code === "unrecognized_keys"
                ? "Unexpected enquiry fields."
                : issue.message,
          })),
        );
      }

      ctx.body = presentEnquiryAccepted(await enquiries.submit(request.data));
      ctx.status = 202;
      ctx.set("Cache-Control", "no-store");
    },
  );
  return router;
}
