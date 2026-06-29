import styles from "./AppShell.module.css";

export function PlaceholderPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className={styles.placeholder}>
      <h2 className={styles.placeholderTitle}>{title}</h2>
      <div className={styles.placeholderText}>{children}</div>
    </section>
  );
}
