import { AppHeader } from '@/components/site/AppHeader';
import { AppShell } from '@/components/site/AppShell';
import { Mt5Dashboard } from '@/components/dashboards/mt5/Mt5Dashboard';

export default function Mt5Page() {
  return (
    <AppShell>
      <AppHeader
        kicker="Working / Trading"
        title="MT5 Trading Dashboard"
        description="Trading performance, account health, latest deals, and copy-trade monitoring from the live MT5 API."
      />
      <Mt5Dashboard mode="trading" />
    </AppShell>
  );
}
