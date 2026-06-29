import Link from "next/link";
import { AppHeader } from "@/components/site/AppHeader";
import { AppShell } from "@/components/site/AppShell";
import { PlaceholderPanel } from "@/components/site/PlaceholderPanel";
import styles from "@/components/site/AppShell.module.css";

export default function BlogPage() {
  return (
    <AppShell>
      <AppHeader
        kicker="Sharing / Blog"
        title="Blog"
        description="A future space for personal writing, project notes, marketing learnings, case studies, and public updates."
        action={<Link className={styles.actionLink} href="/sharing">Back to Sharing</Link>}
      />

      <PlaceholderPanel title="Blog placeholder">
        <p>
          Keep this route for long-form writing. Later, it can read Markdown, MDX, Notion export, or a CMS depending on how you want to publish content.
        </p>
      </PlaceholderPanel>
    </AppShell>
  );
}
