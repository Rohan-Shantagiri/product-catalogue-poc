import { useMutation } from "@tanstack/react-query";
import { submitEnquiry } from "./api";

export function useEnquiryMutation() {
  return useMutation({ mutationFn: submitEnquiry, retry: false, gcTime: 0 });
}
