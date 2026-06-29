import { AppHeader } from "@/components/site/AppHeader";
import { AppShell } from "@/components/site/AppShell";
import { ModuleCard } from "@/components/site/ModuleCard";
import styles from "@/components/site/AppShell.module.css";
import { siteSections } from "@/lib/site-navigation";

export default function WorkingPage() {
  const section = siteSections.find((item) => item.title === "Working")!;

  return (
    <AppShell>
      <AppHeader
        kicker="Working"
        title="Work Dashboards"
        description="Trading performance, commission tracking, and other business dashboards live here. This keeps work tools separate from fitness and sharing content."
      />

      <section className={styles.sectionGrid}>
        {section.modules.map((module) => (
          <ModuleCard key={module.href} module={module} />
        ))}
      </section>
    </AppShell>
  );
}
