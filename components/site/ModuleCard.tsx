import Link from "next/link";
import styles from "./AppShell.module.css";
import { StatusPill } from "./StatusPill";
import type { SiteModule } from "@/lib/site-navigation";

export function ModuleCard({ module }: { module: SiteModule }) {
  return (
    <Link className={styles.moduleCard} href={module.href}>
      <div className={styles.moduleTopline}>
        <span className={styles.eyebrow}>{module.eyebrow ?? module.category}</span>
        <StatusPill status={module.status} />
      </div>

      <div>
        <h2 className={styles.moduleTitle}>{module.title}</h2>
        <p className={styles.moduleDescription}>{module.description}</p>
      </div>

      <div className={styles.moduleFooter}>
        <span>Open module</span>
        <span aria-hidden="true">→</span>
      </div>
    </Link>
  );
}
