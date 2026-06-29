import Link from "next/link";
import { AppHeader } from "@/components/site/AppHeader";
import { AppShell } from "@/components/site/AppShell";
import { PlaceholderPanel } from "@/components/site/PlaceholderPanel";
import styles from "@/components/site/AppShell.module.css";

export default function CommissionDashboardPage() {
  return (
    <AppShell>
      <AppHeader
        kicker="Working / Commission"
        title="Commission Dashboard"
        description="A separated area for partner commission, payout, and revenue-share reporting. This keeps commission data out of the MT5 trading performance dashboard."
        action={<Link className={styles.actionLink} href="/working">Back to Working</Link>}
      />

      <PlaceholderPanel title="Commission dashboard placeholder">
        <p>
          This page is ready for the future commission module. Suggested focus: lifetime commission, date-range commission, partner payout, and reconciliation status.
        </p>
      </PlaceholderPanel>
    </AppShell>
  );
}
