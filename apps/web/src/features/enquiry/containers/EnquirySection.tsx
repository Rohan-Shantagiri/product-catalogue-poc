import type { EnquiryFormValues } from "@catalogue/contracts";
import { useId, useRef, useState } from "react";
import { ApiError } from "../../../shared/api/api-error";
import { EnquiryForm, type EnquiryFeedback } from "../components/EnquiryForm";
import { EnquiryThankYou } from "../components/EnquiryThankYou";
import styles from "../components/Enquiry.module.css";
import { useEnquiryMutation } from "../mutations";

const customerFields = ["name", "email", "phone", "message"] as const;

function getFeedback(error: unknown): EnquiryFeedback {
  const fallback = {
    message: "We couldn't send your enquiry. Please try again.",
  };
  if (!(error instanceof ApiError)) return fallback;

  switch (error.status) {
    case 400: {
      const fields: EnquiryFeedback["fields"] = {};
      for (const { path, message } of error.fieldErrors ?? []) {
        const field = customerFields.find((name) => name === path);
        if (field) fields[field] = message;
      }
      return Object.keys(fields).length > 0 ? { fields } : fallback;
    }
    case 422:
      return { message: "This product is no longer available." };
    case 429: {
      if (error.retryAfterSeconds === undefined) {
        return { message: "Too many enquiries. Please try again later." };
      }
      const minutes = Math.max(1, Math.ceil(error.retryAfterSeconds / 60));
      return {
        message: `Too many enquiries. Please try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`,
      };
    }
    default:
      return fallback;
  }
}

export function EnquirySection({
  productId,
  title,
}: {
  productId: string;
  title: string;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const [customer, setCustomer] =
    useState<Pick<EnquiryFormValues, "name" | "email">>();
  const submitting = useRef(false);
  const mutation = useEnquiryMutation();

  async function send(values: EnquiryFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await mutation.mutateAsync({ productId, ...values });
      setCustomer({ name: values.name, email: values.email });
    } catch (error) {
      return getFeedback(error);
    } finally {
      mutation.reset();
      submitting.current = false;
    }
  }

  return (
    <div className={styles.section}>
      {customer ? (
        <EnquiryThankYou title={title} {...customer} />
      ) : (
        <>
          <button
            aria-expanded={open}
            aria-controls={panelId}
            className={styles.button}
            disabled={mutation.isPending}
            onClick={() => setOpen(!open)}
            type="button"
          >
            Enquire about this product
          </button>
          <div id={panelId} hidden={!open}>
            {open && <EnquiryForm onSend={send} />}
          </div>
        </>
      )}
    </div>
  );
}
