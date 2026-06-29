'use client';

import { useEffect, useState } from 'react';
import styles from './RunningDashboard.module.css';

type Activity = {
  activity_id: number;
  name: string;
  local_date: string;
  distance_km: number;
  moving_time_sec: number;
  avg_pace_text: string;
  avg_hr_bpm?: number | null;
  total_elevation_gain_m?: number | null;
  strava_link?: string;
};

type Health = { ok: boolean; activities: number; splits: number; laps: number };

type Summary = Record<string, any>;

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.json();
}

function km(value: number | null | undefined) {
  return `${Number(value || 0).toFixed(1)} km`;
}

function timeFromSeconds(value: number | null | undefined) {
  const seconds = Number(value || 0);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m`;
}

export function RunningDashboard() {
  const [health, setHealth] = useState<Health | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [healthData, summaryData, activitiesData] = await Promise.all([
          getJson<Health>('/api/running/health'),
          getJson<Summary>('/api/running/summary'),
          getJson<any>('/api/running/activities?limit=50'),
        ]);
        if (!active) return;
        setHealth(healthData);
        setSummary(summaryData);
        setActivities(Array.isArray(activitiesData) ? activitiesData : activitiesData.activities || []);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, []);

  const totalKm = activities.reduce((acc, run) => acc + Number(run.distance_km || 0), 0);
  const totalTime = activities.reduce((acc, run) => acc + Number(run.moving_time_sec || 0), 0);
  const longestRun = activities.reduce((max, run) => Math.max(max, Number(run.distance_km || 0)), 0);
  const latestRun = activities[0];

  if (loading) return <div className={styles.loading}>Loading Strava dashboard...</div>;
  if (error) return <div className={styles.error}>Running API error: {error}. Deploy Running API first or set RUNNING_API_BASE_URL in Cloudflare Pages.</div>;

  return (
    <div className={styles.dashboard}>
      <section className={styles.grid}>
        <Card label="Runs" value={`${health?.activities ?? activities.length}`} hint={`${health?.splits ?? 0} splits · ${health?.laps ?? 0} laps`} />
        <Card label="Recent Distance" value={km(totalKm)} hint="Based on loaded recent activities" />
        <Card label="Recent Time" value={timeFromSeconds(totalTime)} hint="Moving time" />
        <Card label="Longest Run" value={km(longestRun)} hint={latestRun ? `Latest: ${latestRun.local_date}` : 'No activity yet'} />
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2 className={styles.title}>Recent Runs</h2><p className={styles.subtitle}>Synced from Strava into SQL, then exposed through the Running API.</p></div>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Date</th><th>Name</th><th>Distance</th><th>Moving Time</th><th>Pace</th><th>HR</th><th>Elevation</th></tr></thead>
            <tbody>
              {activities.map((run) => (
                <tr key={run.activity_id}>
                  <td>{run.local_date}</td>
                  <td>{run.strava_link ? <a href={run.strava_link} target="_blank">{run.name}</a> : run.name}</td>
                  <td>{km(run.distance_km)}</td>
                  <td>{timeFromSeconds(run.moving_time_sec)}</td>
                  <td>{run.avg_pace_text || '-'}</td>
                  <td>{run.avg_hr_bpm ? Math.round(run.avg_hr_bpm) : '-'}</td>
                  <td>{run.total_elevation_gain_m ? `${Math.round(run.total_elevation_gain_m)} m` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <article className={styles.card}><div className={styles.label}>{label}</div><div className={styles.value}>{value}</div><div className={styles.hint}>{hint}</div></article>;
}
