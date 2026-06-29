import styles from "./AppShell.module.css";
import type { ModuleStatus } from "@/lib/site-navigation";

export function StatusPill({ status }: { status: ModuleStatus }) {
  const className =
    status === "Active"
      ? styles.statusActive
      : status === "Building"
        ? styles.statusBuilding
        : styles.statusSoon;

  return <span className={`${styles.status} ${className}`}>{status}</span>;
}
