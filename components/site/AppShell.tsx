import styles from "./AppShell.module.css";
import { AppSidebar } from "./AppSidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.shell}>
      <div className={styles.frame}>
        <AppSidebar />
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
