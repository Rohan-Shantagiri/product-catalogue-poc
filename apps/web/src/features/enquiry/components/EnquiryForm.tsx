import {
  enquiryFormSchema,
  type EnquiryFormValues,
} from "@catalogue/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import styles from "./Enquiry.module.css";

type FieldName = keyof EnquiryFormValues;

export type EnquiryFeedback = {
  fields?: Partial<Record<FieldName, string>>;
  message?: string;
};

export function EnquiryForm({
  onSend,
}: {
  onSend: (values: EnquiryFormValues) => Promise<EnquiryFeedback | undefined>;
}) {
  const id = useId();
  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<EnquiryFormValues>({
    resolver: zodResolver(enquiryFormSchema),
    defaultValues: { name: "", email: "", phone: "", message: "" },
  });

  useEffect(() => setFocus("name"), [setFocus]);

  const submit = handleSubmit(async (values) => {
    const feedback = await onSend(values);
    if (!feedback) return;

    const fields = feedback.fields;
    if (fields) {
      const names = ["name", "email", "phone", "message"] as const;
      const first = names.find((name) => fields[name]);
      for (const name of names) {
        const message = fields[name];
        if (message)
          setError(
            name,
            { type: "server", message },
            { shouldFocus: name === first },
          );
      }
    }
    if (feedback.message)
      setError("root.server", { message: feedback.message });
  });

  function fieldAttributes(name: FieldName) {
    return {
      "aria-invalid": errors[name] ? true : undefined,
      "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
      ...register(name),
    };
  }

  function fieldError(name: FieldName) {
    const error = errors[name];
    return (
      error && (
        <span id={`${id}-${name}-error`} className={styles.error}>
          {error.message}
        </span>
      )
    );
  }

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => void submit(event)}
    >
      <label>
        Full name
        <input
          autoComplete="name"
          required
          maxLength={100}
          {...fieldAttributes("name")}
        />
      </label>
      {fieldError("name")}
      <label>
        Email
        <input
          autoComplete="email"
          type="email"
          required
          maxLength={254}
          {...fieldAttributes("email")}
        />
      </label>
      {fieldError("email")}
      <label>
        Phone (optional)
        <input
          autoComplete="tel"
          type="tel"
          maxLength={30}
          {...fieldAttributes("phone")}
        />
      </label>
      {fieldError("phone")}
      <label>
        Message (optional)
        <textarea rows={4} maxLength={2000} {...fieldAttributes("message")} />
      </label>
      {fieldError("message")}
      {errors.root?.server && (
        <p role="alert" className={styles.error}>
          {errors.root.server.message}
        </p>
      )}
      <button type="submit" className={styles.button} disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send enquiry"}
      </button>
      <p className={styles.privacy}>
        We'll only use these details to respond to your enquiry.
      </p>
    </form>
  );
}
