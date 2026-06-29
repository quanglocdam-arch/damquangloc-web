import styles from "./AppShell.module.css";

export function AppHeader({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        <p className={styles.headerKicker}>{kicker}</p>
        <h1 className={styles.headerTitle}>{title}</h1>
        {description ? <p className={styles.headerDescription}>{description}</p> : null}
      </div>
      {action ? <div className={styles.headerAction}>{action}</div> : null}
    </header>
  );
}
