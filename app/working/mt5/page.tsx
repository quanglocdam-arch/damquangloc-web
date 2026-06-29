import Link from "next/link";
import { AppHeader } from "@/components/site/AppHeader";
import { AppShell } from "@/components/site/AppShell";
import { PlaceholderPanel } from "@/components/site/PlaceholderPanel";
import styles from "@/components/site/AppShell.module.css";

export default function MT5DashboardPage() {
  return (
    <AppShell>
      <AppHeader
        kicker="Working / Trading"
        title="MT5 Trading Dashboard"
        description="This route is reserved for the MT5 trading performance dashboard. Existing MT5 UI can be moved into this page without mixing it with Strava or blog content."
        action={<Link className={styles.actionLink} href="/working">Back to Working</Link>}
      />

      <PlaceholderPanel title="Move current MT5 dashboard here">
        <p>
          Recommended final route: <strong>/working/mt5</strong>. Keep this page focused on trading performance, account balance, PNL, copy integrity, and health checks.
        </p>
      </PlaceholderPanel>
    </AppShell>
  );
}
