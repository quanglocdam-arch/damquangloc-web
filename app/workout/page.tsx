import { AppHeader } from "@/components/site/AppHeader";
import { AppShell } from "@/components/site/AppShell";
import { ModuleCard } from "@/components/site/ModuleCard";
import styles from "@/components/site/AppShell.module.css";
import { siteSections } from "@/lib/site-navigation";

export default function WorkoutPage() {
  const section = siteSections.find((item) => item.title === "Workout")!;

  return (
    <AppShell>
      <AppHeader
        kicker="Workout"
        title="Fitness & Running"
        description="Running progress, Strava activities, pace trends, lap analysis, and future workout data will be organized in this area."
      />

      <section className={styles.sectionGrid}>
        {section.modules.map((module) => (
          <ModuleCard key={module.href} module={module} />
        ))}
      </section>
    </AppShell>
  );
}
