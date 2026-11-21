import { useEffect, useRef } from "react";
import styles from "./Enquiry.module.css";

export function EnquiryThankYou({
  name,
  title,
  email,
}: {
  name: string;
  title: string;
  email: string;
}) {
  const status = useRef<HTMLDivElement>(null);
  useEffect(() => status.current?.focus(), []);

  return (
    <div className={styles.thanks} ref={status} role="status" tabIndex={-1}>
      Thank you, {name}! We've received your enquiry about {title}. Our sales
      team will contact you at {email}.
    </div>
  );
}
