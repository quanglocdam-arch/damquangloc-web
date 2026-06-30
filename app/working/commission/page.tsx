'use client'

import { useEffect, useMemo, useState } from 'react'
import { getAllowedLogins, isAdmin } from '@/lib/account-mapping'

const API_URL = 'https://api.damquangloc.com'
const API_KEY = 'mt5dashboard2026'
const TRADING_DAY_START_HOUR = 7

type TimelinePreset =
  | 'lifetime'
  | 'lastmonth'
  | 'thismonth'
  | 'thisweek'
  | 'lastweek'
  | 'yesterday'
  | 'today'
  | 'custom'

const TIMELINE_OPTIONS: { value: TimelinePreset; label: string }[] = [
  { value: 'lifetime', label: 'Lifetime' },
  { value: 'lastmonth', label: 'Last Month' },
  { value: 'thismonth', label: 'This Month' },
  { value: 'thisweek', label: 'This Week' },
  { value: 'lastweek', label: 'Last Week' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'today', label: 'Today' },
  { value: 'custom', label: 'Custom' },
]

interface TimeBasis {
  mode: string
  timezone: string
  reset_hour: number
  selected_filter: string
  trading_from: string
  trading_to: string
  calendar_from: string
  calendar_to: string
}

interface SyncInfo {
  started_at: string | null
  finished_at: string | null
  status: string | null
  date_from: string | null
  date_to: string | null
  records_fetched: number
  records_inserted: number
  records_updated: number
  error_message: string | null
}

interface SummaryResponse {
  time_basis: TimeBasis
  record_count: number
  client_account_count: number
  total_reward: number
  total_reward_usd: number
  total_volume_lots: number
  total_volume_mln_usd: number
  total_orders: number
  last_sync: SyncInfo | null
}

interface ByAccountItem {
  client_account: string
  account_login: number | null
  account_label: string
  mapped: boolean
  client_uid: string | null
  partner_account: string | null
  currency: string
  record_count: number
  reward: number
  reward_usd: number
  volume_lots: number
  volume_mln_usd: number
  orders_count: number
  first_reward_date: string | null
  last_reward_date: string | null
}

interface ByAccountResponse {
  time_basis: TimeBasis
  total: number
  totals: {
    reward_usd: number
    volume_lots: number
    orders_count: number
    record_count: number
  }
  items: ByAccountItem[]
}

interface DetailItem {
  exness_id: number
  reward_order: string
  client_account: string
  account_login: number | null
  client_uid: string | null
  partner_account: string | null
  currency: string
  reward_date: string
  reward_datetime_utc: string
  reward_datetime_vn: string
  trading_date: string
  reward: number
  reward_usd: number
  volume_lots: number
  volume_mln_usd: number
  orders_count: number
}

interface DetailResponse {
  time_basis: TimeBasis
  total: number
  items: DetailItem[]
}

function getEmailFromCookie(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const cfCookie = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('CF_Authorization='))
    if (!cfCookie) return 'damquangloc.offical@gmail.com'
    const jwt = cfCookie.split('=').slice(1).join('=').trim()
    const parts = jwt.split('.')
    if (parts.length !== 3) return 'damquangloc.offical@gmail.com'
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.email || null
  } catch {
    return 'damquangloc.offical@gmail.com'
  }
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

function toISODate(d: Date): string {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

function formatDMY(iso: string): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return d + '/' + m + '/' + y
}

function fmtMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value || 0)
}

function fmtNum(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0)
}

function fmtInt(value: number): string {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value || 0)
}

function getCurrentTradingDate(now = new Date()): Date {
  const current = new Date(now)
  if (current.getHours() < TRADING_DAY_START_HOUR) current.setDate(current.getDate() - 1)
  current.setHours(0, 0, 0, 0)
  return current
}

function getPresetDateRange(preset: TimelinePreset, now = new Date()): { start: string; end: string } {
  const current = getCurrentTradingDate(now)

  if (preset === 'lifetime') {
    return { start: '2020-01-01', end: toISODate(current) }
  }

  if (preset === 'today') {
    const d = toISODate(current)
    return { start: d, end: d }
  }

  if (preset === 'yesterday') {
    const d = new Date(current)
    d.setDate(d.getDate() - 1)
    const iso = toISODate(d)
    return { start: iso, end: iso }
  }

  if (preset === 'thisweek' || preset === 'lastweek') {
    const day = current.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day
    const monday = new Date(current)
    monday.setDate(current.getDate() + diffToMonday)
    if (preset === 'lastweek') monday.setDate(monday.getDate() - 7)
    const sunday = new Date(monday)
    sunday.setDate(monday.getDate() + 6)
    return { start: toISODate(monday), end: toISODate(sunday) }
  }

  if (preset === 'lastmonth') {
    const start = new Date(current.getFullYear(), current.getMonth() - 1, 1)
    const end = new Date(current.getFullYear(), current.getMonth(), 0)
    return { start: toISODate(start), end: toISODate(end) }
  }

  const start = new Date(current.getFullYear(), current.getMonth(), 1)
  return { start: toISODate(start), end: toISODate(current) }
}

function getTimelineLabel(preset: TimelinePreset, start: string, end: string): string {
  if (preset === 'lifetime') return 'Lifetime'
  const found = TIMELINE_OPTIONS.find(o => o.value === preset)
  const label = found?.label || 'Custom'
  return label + ' · Trading date ' + formatDMY(start) + ' → ' + formatDMY(end)
}

function timeBasisLabel(basis?: TimeBasis | null): string {
  if (!basis) return 'MT5 Trading Day · Reset 07:00 GMT+7'
  return 'Trading range ' + basis.trading_from.replace(':00', '') + ' → ' + basis.trading_to.replace(':59', '')
}

function buildRangeParams(preset: TimelinePreset, startDate: string, endDate: string): string {
  const range = preset === 'lifetime' ? getPresetDateRange('lifetime') : { start: startDate, end: endDate }
  return '&date_from=' + encodeURIComponent(range.start) + '&date_to=' + encodeURIComponent(range.end)
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-bold text-slate-900 mb-1">{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function TimelineControls({
  preset,
  startDate,
  endDate,
  today,
  onPresetChange,
  onStartChange,
  onEndChange,
}: {
  preset: TimelinePreset
  startDate: string
  endDate: string
  today: string
  onPresetChange: (v: TimelinePreset) => void
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={preset}
        onChange={e => onPresetChange(e.target.value as TimelinePreset)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white outline-none focus:border-slate-400"
      >
        {TIMELINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <input
        type="date"
        value={startDate}
        max={today}
        disabled={preset !== 'custom'}
        onChange={e => onStartChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white outline-none disabled:bg-slate-50 disabled:text-slate-400"
      />
      <span className="text-slate-400 text-sm">→</span>
      <input
        type="date"
        value={endDate}
        max={today}
        disabled={preset !== 'custom'}
        onChange={e => onEndChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white outline-none disabled:bg-slate-50 disabled:text-slate-400"
      />
    </div>
  )
}

export default function CommissionDashboardPage() {
  const tradingToday = getCurrentTradingDate(new Date())
  const todayISO = toISODate(tradingToday)
  const firstOfMonthISO = toISODate(new Date(tradingToday.getFullYear(), tradingToday.getMonth(), 1))

  const [email, setEmail] = useState<string | null | undefined>(undefined)
  const [timelinePreset, setTimelinePreset] = useState<TimelinePreset>('thismonth')
  const [startDate, setStartDate] = useState(firstOfMonthISO)
  const [endDate, setEndDate] = useState(todayISO)
  const [accountFilter, setAccountFilter] = useState('all')
  const [summary, setSummary] = useState<SummaryResponse | null>(null)
  const [byAccount, setByAccount] = useState<ByAccountResponse | null>(null)
  const [detail, setDetail] = useState<DetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEmail(getEmailFromCookie())
  }, [])

  function handlePresetChange(preset: TimelinePreset) {
    setTimelinePreset(preset)
    if (preset === 'custom') return
    const range = getPresetDateRange(preset, new Date())
    setStartDate(range.start)
    setEndDate(range.end)
  }

  const allowedLogins = useMemo(() => {
    if (!email) return 'all' as const
    return getAllowedLogins(email)
  }, [email])

  const timelineLabel = getTimelineLabel(timelinePreset, startDate, endDate)

  useEffect(() => {
    if (email === undefined || email === null) return
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const rangeParams = buildRangeParams(timelinePreset, startDate, endDate)
        const accountParam = accountFilter !== 'all' ? '&account=' + encodeURIComponent(accountFilter) : ''
        const [summaryRes, byAccountRes, detailRes] = await Promise.all([
          fetch(API_URL + '/api/exness/rewards/summary?api_key=' + API_KEY + rangeParams + accountParam, { cache: 'no-store' }),
          fetch(API_URL + '/api/exness/rewards/by-account?api_key=' + API_KEY + rangeParams, { cache: 'no-store' }),
          fetch(API_URL + '/api/exness/rewards/detail?api_key=' + API_KEY + rangeParams + accountParam + '&limit=300', { cache: 'no-store' }),
        ])
        if (!summaryRes.ok || !byAccountRes.ok || !detailRes.ok) throw new Error('API error')
        setSummary(await summaryRes.json())
        setByAccount(await byAccountRes.json())
        setDetail(await detailRes.json())
      } catch {
        setError('Không thể tải dữ liệu Exness Partner Commission.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [email, timelinePreset, startDate, endDate, accountFilter])

  const accountItems = useMemo(() => {
    const items = byAccount?.items || []
    const filtered = allowedLogins === 'all'
      ? items
      : items.filter(i => i.account_login && allowedLogins.includes(i.account_login))
    if (accountFilter === 'all') return filtered
    return filtered.filter(i => String(i.account_login || i.client_account) === accountFilter)
  }, [byAccount, allowedLogins, accountFilter])

  const selectableAccounts = useMemo(() => {
    const items = byAccount?.items || []
    return allowedLogins === 'all'
      ? items
      : items.filter(i => i.account_login && allowedLogins.includes(i.account_login))
  }, [byAccount, allowedLogins])

  if (email === null) {
    return <main className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">Bạn chưa đăng nhập.</main>
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Exness Partner API</p>
            <h1 className="text-2xl font-bold text-slate-900">Commission Dashboard</h1>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <p className="text-sm text-slate-600">{email}</p>
              {email && isAdmin(email) && <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">Admin</span>}
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full inline-block">
              {summary?.last_sync?.finished_at ? 'Last sync: ' + summary.last_sync.finished_at : 'Sync status: —'}
            </p>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">Tổng quan Commission</h2>
            <p className="text-sm text-slate-500 mt-1">{timelineLabel}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={accountFilter}
              onChange={e => setAccountFilter(e.target.value)}
              className="text-sm border border-slate-200 rounded-lg px-3 py-2 text-slate-700 bg-white outline-none focus:border-slate-400"
            >
              <option value="all">Tất cả tài khoản</option>
              {selectableAccounts.map(i => (
                <option key={i.client_account} value={String(i.account_login || i.client_account)}>
                  {i.account_label || i.client_account}
                </option>
              ))}
            </select>
            <TimelineControls
              preset={timelinePreset}
              startDate={startDate}
              endDate={endDate}
              today={todayISO}
              onPresetChange={handlePresetChange}
              onStartChange={v => { setTimelinePreset('custom'); setStartDate(v) }}
              onEndChange={v => { setTimelinePreset('custom'); setEndDate(v) }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-sm text-slate-600 shadow-sm">
          <p className="font-semibold text-slate-900">MT5 Trading Time Basis</p>
          <p className="mt-1">{timeBasisLabel(summary?.time_basis)}</p>
        </div>

        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Commission USD" value={loading ? '...' : fmtMoney(summary?.total_reward_usd || 0)} sub="SUM reward_usd" />
          <StatCard label="Volume Lots" value={loading ? '...' : fmtNum(summary?.total_volume_lots || 0, 2)} sub="SUM volume_lots" />
          <StatCard label="Orders" value={loading ? '...' : fmtInt(summary?.total_orders || 0)} sub="SUM orders_count" />
          <StatCard label="Client Accounts" value={loading ? '...' : fmtInt(summary?.client_account_count || 0)} sub={(summary?.record_count || 0) + ' reward records'} />
          <StatCard label="Reward" value={loading ? '...' : fmtMoney(summary?.total_reward || 0)} sub="Original reward field" />
          <StatCard label="Volume MLN USD" value={loading ? '...' : fmtNum(summary?.total_volume_mln_usd || 0, 4)} sub="SUM volume_mln_usd" />
          <StatCard label="Inserted" value={loading ? '...' : fmtInt(summary?.last_sync?.records_inserted || 0)} sub="Last sync" />
          <StatCard label="Updated" value={loading ? '...' : fmtInt(summary?.last_sync?.records_updated || 0)} sub="Last sync" />
        </div>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Commission by Account</h3>
            <span className="text-xs text-slate-400">{accountItems.length} rows</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-6 py-3 text-left">Account</th>
                  <th className="px-6 py-3 text-right">Commission USD</th>
                  <th className="px-6 py-3 text-right">Reward</th>
                  <th className="px-6 py-3 text-right">Lots</th>
                  <th className="px-6 py-3 text-right">MLN USD</th>
                  <th className="px-6 py-3 text-right">Orders</th>
                  <th className="px-6 py-3 text-right">Records</th>
                  <th className="px-6 py-3 text-right">Last Reward</th>
                </tr>
              </thead>
              <tbody>
                {accountItems.map(i => (
                  <tr key={i.client_account} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-900">{i.account_label}</p>
                      <p className="text-xs text-slate-400">{i.client_account}{!i.mapped ? ' · unmapped' : ''}</p>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">{fmtMoney(i.reward_usd)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmtMoney(i.reward)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmtNum(i.volume_lots, 2)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmtNum(i.volume_mln_usd, 4)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmtInt(i.orders_count)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmtInt(i.record_count)}</td>
                    <td className="px-6 py-4 text-right text-slate-500">{i.last_reward_date ? formatDMY(i.last_reward_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Reward Details</h3>
            <span className="text-xs text-slate-400">Latest {detail?.items?.length || 0} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                  <th className="px-6 py-3 text-left">Trading Date</th>
                  <th className="px-6 py-3 text-left">Datetime VN</th>
                  <th className="px-6 py-3 text-left">Client Account</th>
                  <th className="px-6 py-3 text-left">Client UID</th>
                  <th className="px-6 py-3 text-right">Reward USD</th>
                  <th className="px-6 py-3 text-right">Lots</th>
                  <th className="px-6 py-3 text-right">Orders</th>
                  <th className="px-6 py-3 text-left">Reward Order</th>
                </tr>
              </thead>
              <tbody>
                {(detail?.items || []).map(i => (
                  <tr key={i.exness_id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-6 py-4 text-slate-700">{formatDMY(i.trading_date)}</td>
                    <td className="px-6 py-4 text-slate-500">{i.reward_datetime_vn || '—'}</td>
                    <td className="px-6 py-4 text-slate-900 font-medium">{i.client_account}</td>
                    <td className="px-6 py-4 text-slate-500">{i.client_uid || '—'}</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-900">{fmtMoney(i.reward_usd)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmtNum(i.volume_lots, 2)}</td>
                    <td className="px-6 py-4 text-right text-slate-700">{fmtInt(i.orders_count)}</td>
                    <td className="px-6 py-4 text-slate-500">{i.reward_order || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  )
}
