'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './Mt5Dashboard.module.css';
import {
  Deal,
  DealsResponse,
  HealthResponse,
  classForValue,
  groupBy,
  money,
  number2,
  pct,
  sum,
  IGNORED_LOGINS,
} from './dashboard-utils';

type Mode = 'trading' | 'commission' | 'finance';

type Props = {
  mode: Mode;
};

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }
  return response.json();
}

export function Mt5Dashboard({ mode }: Props) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [deals, setDeals] = useState<DealsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const [healthData, dealsData] = await Promise.all([
          getJson<HealthResponse>('/api/mt5/health'),
          getJson<DealsResponse>('/api/mt5/deals?days=365'),
        ]);
        if (!active) return;
        setHealth(healthData);
        setDeals(dealsData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const allDeals = deals?.deals || [];
  const activeDeals = useMemo(() => allDeals.filter((deal) => !IGNORED_LOGINS.has(deal.account_login)), [allDeals]);
  const accounts = health?.accounts?.items || [];
  const activeAccounts = accounts.filter((account) => !IGNORED_LOGINS.has(account.login));

  const totals = useMemo(() => {
    const net = sum(activeDeals, (deal) => deal.net_profit);
    const profit = sum(activeDeals, (deal) => deal.profit);
    const commission = sum(activeDeals, (deal) => deal.commission);
    const wins = activeDeals.filter((deal) => deal.net_profit > 0).length;
    const balance = sum(activeAccounts, (account) => account.balance);
    const equity = sum(activeAccounts, (account) => account.equity);
    return {
      net,
      profit,
      commission,
      wins,
      winRate: activeDeals.length ? (wins / activeDeals.length) * 100 : 0,
      balance,
      equity,
      deals: activeDeals.length,
      openPositions: sum(activeAccounts, (account) => account.open_positions),
    };
  }, [activeDeals, activeAccounts]);

  const byAccount = useMemo(() => {
    return Object.entries(groupBy(activeDeals, (deal) => deal.account_label))
      .map(([label, rows]) => ({
        label,
        deals: rows.length,
        net: sum(rows, (deal) => deal.net_profit),
        profit: sum(rows, (deal) => deal.profit),
        commission: sum(rows, (deal) => deal.commission),
      }))
      .sort((a, b) => b.net - a.net);
  }, [activeDeals]);

  const bySymbol = useMemo(() => {
    return Object.entries(groupBy(activeDeals, (deal) => deal.symbol))
      .map(([symbol, rows]) => ({
        symbol,
        deals: rows.length,
        net: sum(rows, (deal) => deal.net_profit),
        commission: sum(rows, (deal) => deal.commission),
        volume: sum(rows, (deal) => deal.volume),
      }))
      .sort((a, b) => Math.abs(b.net) - Math.abs(a.net));
  }, [activeDeals]);

  if (loading) return <div className={styles.loading}>Loading dashboard data...</div>;
  if (error) return <div className={styles.error}>API error: {error}</div>;

  if (mode === 'commission') {
    return <CommissionView deals={activeDeals} byAccount={byAccount} bySymbol={bySymbol} totalCommission={totals.commission} />;
  }

  if (mode === 'finance') {
    return <FinanceView health={health} accounts={activeAccounts} totals={totals} byAccount={byAccount} bySymbol={bySymbol} />;
  }

  return (
    <div className={styles.dashboard}>
      <CardGrid
        cards={[
          ['Active Accounts', `${activeAccounts.length}`, `${health?.accounts?.total || 0} configured, Copy5 ignored`],
          ['Balance', money(totals.balance), 'Current active account balance'],
          ['Net Profit', money(totals.net), `${totals.deals} closed deals, last 365 trading days`],
          ['Collector', health?.collector?.status || health?.status || 'unknown', `${health?.collector?.minutes_since_last_snapshot ?? '-'} minutes since snapshot`],
        ]}
      />

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2 className={styles.panelTitle}>Account Health</h2>
            <p className={styles.panelSubtitle}>Realtime health from API, with inactive Copy5 excluded from active totals.</p>
          </div>
          <span className={health?.status === 'healthy' ? styles.statusOk : styles.statusWarn}>{health?.status || 'unknown'}</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Account</th><th>Status</th><th>Balance</th><th>Equity</th><th>Open Pos.</th><th>Last Snapshot</th></tr></thead>
            <tbody>
              {accounts.map((account) => {
                const ignored = IGNORED_LOGINS.has(account.login);
                return (
                  <tr key={account.login}>
                    <td>{account.label}{ignored ? ' · ignored' : ''}</td>
                    <td><span className={account.status === 'healthy' ? styles.statusOk : styles.statusWarn}>{account.status}</span></td>
                    <td>{money(account.balance)}</td>
                    <td>{money(account.equity)}</td>
                    <td>{account.open_positions}</td>
                    <td>{account.last_snapshot_time || '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <DealsTable title="Recent Deals" subtitle="Latest closed deals from the MT5 API." deals={activeDeals.slice(0, 40)} />
    </div>
  );
}

function CardGrid({ cards }: { cards: [string, string, string][] }) {
  return (
    <section className={styles.grid}>
      {cards.map(([label, value, hint]) => (
        <article className={styles.card} key={label}>
          <div className={styles.cardLabel}>{label}</div>
          <div className={styles.cardValue}>{value}</div>
          <div className={styles.cardHint}>{hint}</div>
        </article>
      ))}
    </section>
  );
}

function DealsTable({ title, subtitle, deals }: { title: string; subtitle: string; deals: Deal[] }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h2 className={styles.panelTitle}>{title}</h2>
          <p className={styles.panelSubtitle}>{subtitle}</p>
        </div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Time</th><th>Account</th><th>Symbol</th><th>Side</th><th>Volume</th><th>Profit</th><th>Commission</th><th>Net</th></tr></thead>
          <tbody>
            {deals.map((deal) => (
              <tr key={deal.id}>
                <td>{deal.deal_time}</td>
                <td>{deal.account_label}</td>
                <td>{deal.symbol}</td>
                <td>{deal.direction}</td>
                <td>{number2(deal.volume)}</td>
                <td className={classForValue(deal.profit, styles)}>{money(deal.profit)}</td>
                <td className={classForValue(deal.commission, styles)}>{money(deal.commission)}</td>
                <td className={classForValue(deal.net_profit, styles)}>{money(deal.net_profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CommissionView({ deals, byAccount, bySymbol, totalCommission }: { deals: Deal[]; byAccount: any[]; bySymbol: any[]; totalCommission: number }) {
  return (
    <div className={styles.dashboard}>
      <CardGrid cards={[
        ['Total Commission', money(totalCommission), 'Commission is stored as negative value'],
        ['Closed Deals', `${deals.length}`, 'Last 365 trading days'],
        ['Avg Commission / Deal', money(deals.length ? totalCommission / deals.length : 0), 'Blended across all symbols'],
        ['Symbols', `${bySymbol.length}`, 'Commission grouped by symbol'],
      ]} />
      <SummaryTable title="Commission by Account" subtitle="Use this as the separate commission dashboard." rows={byAccount} firstKey="label" />
      <SummaryTable title="Commission by Symbol" subtitle="Shows which instruments generate the most commission." rows={bySymbol} firstKey="symbol" />
    </div>
  );
}

function FinanceView({ health, accounts, totals, byAccount, bySymbol }: { health: HealthResponse | null; accounts: any[]; totals: any; byAccount: any[]; bySymbol: any[] }) {
  return (
    <div className={styles.dashboard}>
      <CardGrid cards={[
        ['Actual Balance', money(totals.balance), `${accounts.length} active accounts`],
        ['Actual Equity', money(totals.equity), `${totals.openPositions} open positions`],
        ['Trading PNL', money(totals.profit), 'Profit before commission'],
        ['Final Profit', money(totals.net), `Win rate ${pct(totals.winRate)}`],
      ]} />
      <SummaryTable title="Finance by Account" subtitle="Profit, commission, and final net by account." rows={byAccount} firstKey="label" />
      <SummaryTable title="Finance by Symbol" subtitle="Instrument-level performance overview." rows={bySymbol} firstKey="symbol" />
    </div>
  );
}

function SummaryTable({ title, subtitle, rows, firstKey }: { title: string; subtitle: string; rows: any[]; firstKey: string }) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div><h2 className={styles.panelTitle}>{title}</h2><p className={styles.panelSubtitle}>{subtitle}</p></div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>{firstKey === 'symbol' ? 'Symbol' : 'Account'}</th><th>Deals</th><th>Profit</th><th>Commission</th><th>Net</th></tr></thead>
          <tbody>
            {rows.slice(0, 30).map((row) => (
              <tr key={row[firstKey]}>
                <td>{row[firstKey]}</td>
                <td>{row.deals}</td>
                <td className={classForValue(row.profit ?? row.net, styles)}>{money(row.profit ?? row.net)}</td>
                <td className={classForValue(row.commission, styles)}>{money(row.commission)}</td>
                <td className={classForValue(row.net, styles)}>{money(row.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
