import { AppHeader } from '@/components/site/AppHeader';
import { AppShell } from '@/components/site/AppShell';
import { RunningDashboard } from '@/components/dashboards/running/RunningDashboard';

export default function StravaPage() {
  return (
    <AppShell>
      <AppHeader
        kicker="Workout / Running"
        title="Strava Running Dashboard"
        description="Running activity, total mileage, pace, splits, and lap data synced from Strava into the running SQL database."
      />
      <RunningDashboard />
    </AppShell>
  );
}
