import { AppHeader } from "@/components/site/AppHeader";
import { AppShell } from "@/components/site/AppShell";
import { ModuleCard } from "@/components/site/ModuleCard";
import styles from "@/components/site/AppShell.module.css";
import { siteSections } from "@/lib/site-navigation";

export default function SharingPage() {
  const section = siteSections.find((item) => item.title === "Sharing")!;

  return (
    <AppShell>
      <AppHeader
        kicker="Sharing"
        title="Blog & Public Notes"
        description="A dedicated space for writing, case studies, project notes, and content that can be shared publicly."
      />

      <section className={styles.sectionGrid}>
        {section.modules.map((module) => (
          <ModuleCard key={module.href} module={module} />
        ))}
      </section>
    </AppShell>
  );
}
