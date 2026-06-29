export type HealthAccount = {
  login: number;
  label: string;
  status: string;
  last_snapshot_time: string | null;
  minutes_since_last_snapshot: number | null;
  balance: number;
  equity: number;
  open_positions: number;
  open_lots: number;
  issue?: string | null;
};

export type HealthResponse = {
  status: string;
  server_time: string;
  collector?: { status: string; last_snapshot_time: string | null; minutes_since_last_snapshot: number | null };
  accounts?: { total: number; healthy: number; warning: number; critical: number; items: HealthAccount[] };
  issues?: string[];
};

export type Deal = {
  id: number;
  account_login: number;
  account_label: string;
  deal_ticket: number;
  deal_time: string;
  symbol: string;
  direction: string;
  volume: number;
  profit: number;
  commission: number;
  swap: number;
  net_profit: number;
  duration_minutes: number;
};

export type DealsResponse = {
  total: number;
  deals: Deal[];
  time_basis?: Record<string, unknown>;
};

export const IGNORED_LOGINS = new Set<number>([128775309]);

export function money(value: number | null | undefined) {
  const n = Number(value || 0);
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(n);
}

export function number2(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Number(value || 0));
}

export function pct(value: number) {
  return `${Number.isFinite(value) ? value.toFixed(1) : '0.0'}%`;
}

export function sum<T>(items: T[], fn: (item: T) => number) {
  return items.reduce((acc, item) => acc + Number(fn(item) || 0), 0);
}

export function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyFn(item);
    acc[key] ||= [];
    acc[key].push(item);
    return acc;
  }, {});
}

export function classForValue(value: number, styles: Record<string, string>) {
  if (value > 0) return styles.positive;
  if (value < 0) return styles.negative;
  return styles.muted;
}
