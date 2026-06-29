import { AppHeader } from '@/components/site/AppHeader';
import { AppShell } from '@/components/site/AppShell';
import { Mt5Dashboard } from '@/components/dashboards/mt5/Mt5Dashboard';

export default function CommissionPage() {
  return (
    <AppShell>
      <AppHeader
        kicker="Working / Commission"
        title="Commission Dashboard"
        description="Dedicated view for commission tracking by account and symbol. Data is derived from closed MT5 deals."
      />
      <Mt5Dashboard mode="commission" />
    </AppShell>
  );
}
