import styles from "./Status.module.css";

export function StatusMessage({ message }: { message: string }) {
  return (
    <p className={styles.notice} role="status">
      {message}
    </p>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className={styles.notice}>
      <p role="alert">{message}</p>
      <button className={styles.retry} type="button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}
