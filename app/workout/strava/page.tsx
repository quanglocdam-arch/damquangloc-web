import Link from "next/link";
import { AppHeader } from "@/components/site/AppHeader";
import { AppShell } from "@/components/site/AppShell";
import { PlaceholderPanel } from "@/components/site/PlaceholderPanel";
import styles from "@/components/site/AppShell.module.css";

export default function StravaDashboardPage() {
  return (
    <AppShell>
      <AppHeader
        kicker="Workout / Running"
        title="Strava Running Dashboard"
        description="This is the final home for running activity, weekly mileage, monthly trends, splits per kilometer, and lap analysis. Backend API is already ready locally."
        action={<Link className={styles.actionLink} href="/workout">Back to Workout</Link>}
      />

      <section className={styles.metricGrid}>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Backend</p>
          <p className={styles.metricValue}>Ready</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Route</p>
          <p className={styles.metricValue}>/strava</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>Data</p>
          <p className={styles.metricValue}>SQL</p>
        </div>
        <div className={styles.metricCard}>
          <p className={styles.metricLabel}>API</p>
          <p className={styles.metricValue}>8001</p>
        </div>
      </section>

      <div style={{ marginTop: 18 }}>
        <PlaceholderPanel title="Next step: connect Strava API data to this page">
          <p>
            The backend already exposes <strong>/api/running/health</strong>, <strong>/api/running/summary</strong>, and running activity endpoints. After this app shell is installed, we can replace this placeholder with real cards, charts, recent runs, split analysis, and lap tables.
          </p>
        </PlaceholderPanel>
      </div>
    </AppShell>
  );
}
