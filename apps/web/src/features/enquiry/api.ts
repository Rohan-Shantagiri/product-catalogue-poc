import {
  enquiryAcceptedResponseSchema,
  enquiryRequestSchema,
  type EnquiryRequest,
} from "@catalogue/contracts";
import { requestJson } from "../../shared/api/http";

export function submitEnquiry(enquiry: EnquiryRequest) {
  return requestJson("/enquiries", enquiryAcceptedResponseSchema, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(enquiryRequestSchema.parse(enquiry)),
  });
}
