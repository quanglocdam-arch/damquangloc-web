import { AppHeader } from '@/components/site/AppHeader';
import { AppShell } from '@/components/site/AppShell';
import { Mt5Dashboard } from '@/components/dashboards/mt5/Mt5Dashboard';

export default function FinancePage() {
  return (
    <AppShell>
      <AppHeader
        kicker="Working / Finance"
        title="Finance Dashboard"
        description="Balance, equity, PNL, commission, and final profit view across active trading accounts."
      />
      <Mt5Dashboard mode="finance" />
    </AppShell>
  );
}
