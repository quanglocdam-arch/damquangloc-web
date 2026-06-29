import { AppHeader } from "@/components/site/AppHeader";
import { AppShell } from "@/components/site/AppShell";
import { ModuleCard } from "@/components/site/ModuleCard";
import styles from "@/components/site/AppShell.module.css";
import { allModules, siteSections } from "@/lib/site-navigation";

export default function HomePage() {
  const activeCount = allModules.filter((module) => module.status === "Active").length;
  const buildingCount = allModules.filter((module) => module.status === "Building").length;

  return (
    <AppShell>
      <AppHeader
        kicker="Overview"
        title="Personal Command Center"
        description="A structured home for work dashboards, workout data, and personal sharing. Each area is separated so MT5, commission, Strava, and blog modules can grow without becoming messy."
      />

      <section className={styles.contentCard}>
        <div className={styles.metricGrid}>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Total Modules</p>
            <p className={styles.metricValue}>{allModules.length}</p>
          </div>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Active</p>
            <p className={styles.metricValue}>{activeCount}</p>
          </div>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Building</p>
            <p className={styles.metricValue}>{buildingCount}</p>
          </div>
          <div className={styles.metricCard}>
            <p className={styles.metricLabel}>Main Areas</p>
            <p className={styles.metricValue}>{siteSections.length}</p>
          </div>
        </div>
      </section>

      <section className={styles.grid} style={{ marginTop: 18 }}>
        {allModules.map((module) => (
          <ModuleCard key={module.href} module={module} />
        ))}
      </section>
    </AppShell>
  );
}
