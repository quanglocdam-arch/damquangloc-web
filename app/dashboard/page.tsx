'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAllowedLogins, isAdmin } from '@/lib/account-mapping'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const API_URL = 'https://api.damquangloc.com'
const API_KEY = 'mt5dashboard2026'
const TRADING_DAY_START_HOUR = 7

const COLORS: Record<string, string> = {
  Copy1_Quynh:   '#3b82f6',
  Copy2_Tinidam: '#a855f7',
  Copy3_Loc1301: '#22c55e',
  Copy4_Uyen:    '#eab308',
  Copy5_Locloc:  '#f97316',
  Master_Loc:    '#06b6d4',
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Account {
  login: number
  label: string
  snapshot_time: string
  balance: number
  equity: number
  floating_pnl: number
  open_positions: number
  open_lots: number
  currency: string
  leverage: number
  baseline: number
  pnl_vs_baseline: number
}

interface Overview {
  updated_at: string
  accounts: Account[]
}

interface DailyEquityPoint {
  date: string
  equity: number | null
  balance: number | null
}

interface DailyPnLPoint {
  date: string
  pnl: number | null
  deal_count: number
}

interface BaselineOperation {
  time: string
  type: string
  amount: number
}

interface BaselineEntry {
  login: number
  label: string
  total_deposit: number
  total_withdrawal: number
  net_baseline: number
  operations: BaselineOperation[]
}

interface BaselineResponse {
  baselines: Record<string, BaselineEntry>
}

interface DealRow {
  deal_time: string
  profit: number
  commission: number
  swap: number
}

interface DealsResponse {
  total: number
  deals: DealRow[]
}


interface ExnessSyncRun {
  started_at?: string
  finished_at?: string
  status?: string
  date_from?: string
  date_to?: string
  records_fetched?: number
  records_inserted?: number
  records_updated?: number
  error_message?: string | null
}

interface ExnessSummary {
  record_count: number
  client_account_count: number
  total_reward_usd: number
  total_volume_lots: number
  total_orders: number
  last_sync: ExnessSyncRun | null
}

interface ExnessAccountReward {
  client_account: string
  account_login: number | null
  account_label: string
  mapped: boolean
  reward_usd: number
  volume_lots: number
  orders_count: number
  record_count: number
  currency?: string
  first_reward_date?: string | null
  last_reward_date?: string | null
}

interface ExnessByAccountResponse {
  total: number
  totals: {
    reward_usd: number
    volume_lots: number
    orders_count: number
    record_count: number
  }
  items: ExnessAccountReward[]
}

interface AccountMetric {
  netDeposit: number
  netWithdraw: number
  pnl: number
  commission: number
  finalProfit: number
}

type HealthStatus = 'healthy' | 'warning' | 'critical'

interface HealthAccountItem {
  login: number
  label: string
  status: HealthStatus
  last_snapshot_time: string | null
  minutes_since_last_snapshot: number | null
  balance: number | null
  equity: number | null
  open_positions: number | null
  open_lots: number | null
}

interface HealthResponse {
  status: HealthStatus
  server_time: string
  api: {
    status: 'online'
  }
  database: {
    status: 'ok' | 'error'
    error?: string
  }
  collector: {
    status: HealthStatus
    last_snapshot_time: string | null
    minutes_since_last_snapshot: number | null
  }
  accounts: {
    total: number
    healthy: number
    warning: number
    critical: number
    items: HealthAccountItem[]
  }
  issues: string[]
}

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    )
    return payload.email || null
  } catch {
    return 'damquangloc.offical@gmail.com'
  }
}

function fmt(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency === 'USC' ? 'USD' : currency,
    minimumFractionDigits: 2,
  }).format(value)
}

function fmtPnL(value: number): string {
  return (value >= 0 ? '+' : '') + fmt(value)
}


function fmtNum(value: number, decimals = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value || 0)
}


function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function getFinalProfit(pnl: number, commission: number): number {
  // Commission từ API đang là số âm, nên Final Profit = PNL + Commission
  return pnl + commission
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

function toISODate(d: Date): string {
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate())
}

function formatDMY(iso: string): string {
  const [y, m, d] = iso.split('-')
  return d + '/' + m + '/' + y
}

function parseDateTime(value?: string | null): Date | null {
  if (!value) return null
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDateTimeShort(value?: string | null): string {
  const date = parseDateTime(value)
  if (!date) return '—'
  return pad2(date.getDate()) + '/' + pad2(date.getMonth() + 1) + ' ' + pad2(date.getHours()) + ':' + pad2(date.getMinutes())
}

function formatAge(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) return 'Chưa có dữ liệu'
  if (minutes < 1) return 'Vừa xong'
  if (minutes < 60) return minutes + ' phút trước'

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  if (hours < 24) {
    return mins ? hours + ' giờ ' + mins + ' phút trước' : hours + ' giờ trước'
  }

  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return remainHours ? days + ' ngày ' + remainHours + ' giờ trước' : days + ' ngày trước'
}

function getWorstHealthStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('critical')) return 'critical'
  if (statuses.includes('warning')) return 'warning'
  return 'healthy'
}

function getHealthLabel(status: HealthStatus): string {
  if (status === 'healthy') return 'Healthy'
  if (status === 'warning') return 'Warning'
  return 'Critical'
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  copy.setDate(copy.getDate() + days)
  return copy
}

function startOfWeekMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = copy.getDay()
  const diff = day === 0 ? -6 : 1 - day
  copy.setDate(copy.getDate() + diff)
  return copy
}

function getCurrentTradingDate(today: Date): Date {
  const current = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  if (today.getHours() < TRADING_DAY_START_HOUR) {
    current.setDate(current.getDate() - 1)
  }
  return current
}

function getTradingRange(start: string, end: string): { tradingFrom: Date; tradingTo: Date; calendarFrom: Date; calendarTo: Date } {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const tradingFrom = new Date(sy, sm - 1, sd, TRADING_DAY_START_HOUR, 0, 0, 0)
  const tradingTo = new Date(ey, em - 1, ed + 1, TRADING_DAY_START_HOUR, 0, 0, 0)
  tradingTo.setMilliseconds(tradingTo.getMilliseconds() - 1)
  const calendarFrom = new Date(sy, sm - 1, sd, 0, 0, 0, 0)
  const calendarTo = new Date(ey, em - 1, ed, 23, 59, 59, 999)
  return { tradingFrom, tradingTo, calendarFrom, calendarTo }
}

function formatRangeDateTime(d: Date): string {
  return pad2(d.getDate()) + '/' + pad2(d.getMonth() + 1) + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes())
}

function parseLocalDateTime(value?: string | null): Date | null {
  if (!value) return null
  const normalized = value.includes('T') ? value : value.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d
}

function getPresetDateRange(preset: TimelinePreset, today: Date): { start: string; end: string } {
  const current = getCurrentTradingDate(today)

  if (preset === 'today') {
    return { start: toISODate(current), end: toISODate(current) }
  }

  if (preset === 'yesterday') {
    const y = addDays(current, -1)
    return { start: toISODate(y), end: toISODate(y) }
  }

  if (preset === 'thisweek') {
    const start = startOfWeekMonday(current)
    const end = addDays(start, 6)
    return { start: toISODate(start), end: toISODate(end) }
  }

  if (preset === 'lastweek') {
    const thisWeekStart = startOfWeekMonday(current)
    const start = addDays(thisWeekStart, -7)
    const end = addDays(thisWeekStart, -1)
    return { start: toISODate(start), end: toISODate(end) }
  }

  if (preset === 'thismonth') {
    const start = new Date(current.getFullYear(), current.getMonth(), 1)
    return { start: toISODate(start), end: toISODate(current) }
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

// Liệt kê các (year, month) phủ khoảng [start, end] để gọi API daily-* theo từng tháng
function getMonthsInRange(start: string, end: string): { year: number; month: number }[] {
  const startD = new Date(start + 'T00:00:00')
  const endD   = new Date(end   + 'T00:00:00')
  const months: { year: number; month: number }[] = []
  let cur = new Date(startD.getFullYear(), startD.getMonth(), 1)
  const last = new Date(endD.getFullYear(), endD.getMonth(), 1)
  while (cur <= last) {
    months.push({ year: cur.getFullYear(), month: cur.getMonth() + 1 })
    cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
  }
  return months
}

// Có nằm trong khoảng đã chọn không — range dùng MT5 trading day 07:00 → 06:59 GMT+7.
function inRange(timeStr: string, mode: 'lifetime' | 'range', start: string, end: string): boolean {
  if (mode === 'lifetime') return true
  const t = parseLocalDateTime(timeStr)
  if (!t) return false
  const { tradingFrom, tradingTo } = getTradingRange(start, end)
  return t >= tradingFrom && t <= tradingTo
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string
  value: string
  sub?: string
  color?: 'green' | 'red' | 'neutral'
}) {
  const styles: Record<string, string> = {
    green:   'bg-green-50 border-green-200 text-green-700',
    red:     'bg-red-50 border-red-200 text-red-700',
    neutral: 'bg-slate-50 border-slate-200 text-slate-700',
  }
  return (
    <div className={'rounded-xl border p-6 ' + styles[color ?? 'neutral']}>
      <p className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-2">{label}</p>
      <p className="text-3xl font-bold mb-1">{value}</p>
      {sub && <p className="text-xs opacity-70">{sub}</p>}
    </div>
  )
}

function RangeControls({
  startDate, endDate, onStartChange, onEndChange, today, disabled = false,
}: {
  startDate: string
  endDate: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  today: string
  disabled?: boolean
}) {
  const inputClass =
    'text-sm border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-slate-400 ' +
    (disabled
      ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
      : 'bg-white text-slate-700')

  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={startDate}
        max={endDate}
        disabled={disabled}
        onChange={e => onStartChange(e.target.value)}
        className={inputClass}
      />
      <span className="text-slate-300 text-sm">→</span>
      <input
        type="date"
        value={endDate}
        min={startDate}
        max={today}
        disabled={disabled}
        onChange={e => onEndChange(e.target.value)}
        className={inputClass}
      />
    </div>
  )
}

function TimelineControls({
  preset, startDate, endDate, today, onPresetChange, onStartChange, onEndChange,
}: {
  preset: TimelinePreset
  startDate: string
  endDate: string
  today: string
  onPresetChange: (v: TimelinePreset) => void
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
}) {
  const isCustom = preset === 'custom'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={preset}
        onChange={e => onPresetChange(e.target.value as TimelinePreset)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white outline-none focus:border-slate-400"
      >
        {TIMELINE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      {preset === 'lifetime' ? (
        <div className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 text-slate-400 cursor-not-allowed">
          All time
        </div>
      ) : (
        <RangeControls
          startDate={startDate}
          endDate={endDate}
          onStartChange={onStartChange}
          onEndChange={onEndChange}
          today={today}
          disabled={!isCustom}
        />
      )}
    </div>
  )
}


function TimeBasisInfoBar({ preset, startDate, endDate }: {
  preset: TimelinePreset
  startDate: string
  endDate: string
}) {
  if (preset === 'lifetime') {
    return (
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-sm text-slate-600 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Time basis</p>
            <p className="mt-1 font-semibold text-slate-800">Lifetime · all available trading history</p>
          </div>
          <p className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
            MT5 trading day resets at 07:00 GMT+7
          </p>
        </div>
      </div>
    )
  }

  const { tradingFrom, tradingTo, calendarFrom, calendarTo } = getTradingRange(startDate, endDate)
  const selected = TIMELINE_OPTIONS.find(o => o.value === preset)?.label || 'Custom'

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-sm text-slate-600 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">MT5 trading time</p>
          <p className="mt-1 font-semibold text-slate-800">
            {selected} · {formatRangeDateTime(tradingFrom)} → {formatRangeDateTime(tradingTo)} GMT+7
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Calendar comparison · {formatRangeDateTime(calendarFrom)} → {formatRangeDateTime(calendarTo)} GMT+7
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">Daily reset:</span> 07:00 GMT+7
        </div>
      </div>
    </div>
  )
}


function ExnessCommissionPanel({
  accounts, rows, loading, error,
}: {
  accounts: Account[]
  rows: ExnessAccountReward[]
  loading: boolean
  error: string | null
}) {
  const byLogin = rows.reduce((map, row) => {
    if (row.account_login !== null && row.account_login !== undefined) {
      map[String(row.account_login)] = row
    }
    return map
  }, {} as Record<string, ExnessAccountReward>)

  // Luôn render theo đúng thứ tự accounts của Trading Dashboard.
  // Bảng này cố ý không có cột tài khoản, để từng dòng Commission/Lots
  // nằm ngang hàng với từng dòng tài khoản ở bảng bên trái.
  const displayRows = accounts.map(account => {
    return byLogin[String(account.login)] || {
      client_account: String(account.login),
      account_login: account.login,
      account_label: account.label,
      mapped: true,
      reward_usd: 0,
      volume_lots: 0,
      orders_count: 0,
      record_count: 0,
      currency: 'USD',
      first_reward_date: null,
      last_reward_date: null,
    }
  })

  const totals = displayRows.reduce(
    (acc, row) => ({
      reward_usd: acc.reward_usd + (row.reward_usd || 0),
      volume_lots: acc.volume_lots + (row.volume_lots || 0),
      orders_count: acc.orders_count + (row.orders_count || 0),
      record_count: acc.record_count + (row.record_count || 0),
    }),
    { reward_usd: 0, volume_lots: 0, orders_count: 0, record_count: 0 }
  )

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden h-full">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Exness Commission</h3>
        <span className="text-xs text-slate-400">Reward USD / Lots</span>
      </div>

      {error ? (
        <div className="mx-5 mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-sm table-fixed">
          <thead>
            <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
              <th className="px-6 py-3 text-right">Commission</th>
              <th className="px-6 py-3 text-right">Lots</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-12 text-center text-slate-400">
                  Chưa có account để map
                </td>
              </tr>
            ) : displayRows.map(row => (
              <tr key={row.client_account} className="h-[73px] border-b border-slate-50 hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 text-right font-semibold text-emerald-700 align-middle">
                  {loading ? '...' : fmt(row.reward_usd || 0)}
                </td>
                <td className="px-6 py-4 text-right text-slate-700 align-middle">
                  {loading ? '...' : fmtNum(row.volume_lots || 0, 2)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="h-[45px] bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
              <td className="px-6 py-3 text-right text-emerald-700">{loading ? '...' : fmt(totals.reward_usd)}</td>
              <td className="px-6 py-3 text-right">{loading ? '...' : fmtNum(totals.volume_lots, 2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}

function HealthFloatingWidget({
  health, error, loading, expanded, visibleLogins, onToggle, onRefresh,
}: {
  health: HealthResponse | null
  error: string | null
  loading: boolean
  expanded: boolean
  visibleLogins: number[] | 'all'
  onToggle: () => void
  onRefresh: () => void
}) {
  const styles: Record<HealthStatus, { wrap: string; dot: string; label: string; text: string; badge: string }> = {
    healthy: {
      wrap: 'border-emerald-200 bg-emerald-50/95',
      dot: 'bg-emerald-500',
      label: 'Healthy',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
    },
    warning: {
      wrap: 'border-amber-200 bg-amber-50/95',
      dot: 'bg-amber-500',
      label: 'Warning',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
    },
    critical: {
      wrap: 'border-red-200 bg-red-50/95',
      dot: 'bg-red-500',
      label: 'Critical',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
    },
  }

  const rawItems = health?.accounts?.items || []
  const visibleItems = visibleLogins === 'all'
    ? rawItems
    : rawItems.filter(item => visibleLogins.includes(item.login))

  const accountStatuses = visibleItems.map(item => item.status)
  const visibleStatus = error
    ? 'critical'
    : health?.database?.status === 'error'
      ? 'critical'
      : visibleItems.length > 0
        ? getWorstHealthStatus(accountStatuses)
        : health?.status || 'critical'

  const current = styles[visibleStatus]
  const healthyCount = visibleItems.filter(item => item.status === 'healthy').length
  const warningCount = visibleItems.filter(item => item.status === 'warning').length
  const criticalCount = visibleItems.filter(item => item.status === 'critical').length
  const totalAccounts = visibleItems.length || health?.accounts?.total || 0
  const latestMinutes = health?.collector?.minutes_since_last_snapshot ?? null
  const latestTime = health?.collector?.last_snapshot_time ?? null

  return (
    <div
      className={
        'fixed right-3 top-20 z-50 max-w-[calc(100vw-1.5rem)] transition-all duration-200 sm:right-4 sm:top-24 ' +
        (expanded ? 'w-[420px]' : 'w-[248px]')
      }
    >
      <div className={'rounded-xl border shadow-lg backdrop-blur-md ' + current.wrap}>
        <button
          type="button"
          onClick={onToggle}
          className="w-full px-3 py-2 text-left"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className={'h-2 w-2 rounded-full flex-shrink-0 ' + current.dot} />
              <div className="min-w-0">
                <p className={'truncate text-xs font-bold ' + current.text}>System {error ? 'Offline' : current.label}</p>
                <p className="truncate text-[11px] text-slate-500">
                  {error ? 'Lỗi /api/health' : 'Sync ' + formatAge(latestMinutes)}
                </p>
              </div>
            </div>
            <div className="flex flex-shrink-0 items-center gap-1.5">
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                {healthyCount}/{totalAccounts}
              </span>
              <span className="text-[11px] font-medium text-slate-400">{expanded ? 'Ẩn' : '›'}</span>
            </div>
          </div>
        </button>

        {expanded && (
          <div className="border-t border-white/70 px-4 pb-4 pt-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-slate-800">System Health</p>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onRefresh() }}
                className="rounded-lg bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
              >
                {loading ? 'Đang refresh...' : 'Refresh'}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
              <div className="rounded-xl bg-white/75 p-3">
                <p className="text-slate-400 mb-1">API</p>
                <p className={error ? 'font-semibold text-red-700' : 'font-semibold text-emerald-700'}>
                  {error ? 'Offline' : 'Online'}
                </p>
              </div>
              <div className="rounded-xl bg-white/75 p-3">
                <p className="text-slate-400 mb-1">Database</p>
                <p className={health?.database?.status === 'error' ? 'font-semibold text-red-700' : 'font-semibold text-emerald-700'}>
                  {health?.database?.status === 'error' ? 'Error' : 'OK'}
                </p>
              </div>
              <div className="rounded-xl bg-white/75 p-3">
                <p className="text-slate-400 mb-1">Collector</p>
                <p className={'font-semibold ' + current.text}>{error ? 'Unknown' : getHealthLabel(health?.collector?.status || visibleStatus)}</p>
              </div>
              <div className="rounded-xl bg-white/75 p-3">
                <p className="text-slate-400 mb-1">Last Snapshot</p>
                <p className="font-semibold text-slate-700">{formatDateTimeShort(latestTime)}</p>
              </div>
              <div className="rounded-xl bg-white/75 p-3">
                <p className="text-slate-400 mb-1">Freshness</p>
                <p className="font-semibold text-slate-700">{formatAge(latestMinutes)}</p>
              </div>
              <div className="rounded-xl bg-white/75 p-3">
                <p className="text-slate-400 mb-1">Accounts</p>
                <p className="font-semibold text-slate-700">{healthyCount}/{totalAccounts} synced</p>
              </div>
            </div>

            <div className="mb-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-xl bg-white/75 p-2 text-center">
                <p className="font-bold text-emerald-700">{healthyCount}</p>
                <p className="text-slate-400">Healthy</p>
              </div>
              <div className="rounded-xl bg-white/75 p-2 text-center">
                <p className="font-bold text-amber-700">{warningCount}</p>
                <p className="text-slate-400">Warning</p>
              </div>
              <div className="rounded-xl bg-white/75 p-2 text-center">
                <p className="font-bold text-red-700">{criticalCount}</p>
                <p className="text-slate-400">Critical</p>
              </div>
            </div>

            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {visibleItems.length === 0 ? (
                <div className="rounded-xl bg-white/75 px-3 py-3 text-xs text-slate-500">
                  Chưa có dữ liệu account health.
                </div>
              ) : visibleItems.map(account => {
                const accountStyle = styles[account.status]
                return (
                  <div key={account.login} className="rounded-xl bg-white/75 px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-700 truncate">{account.label}</p>
                        <p className="text-slate-400">{account.login}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className={'rounded-full px-2 py-0.5 text-[11px] font-bold ' + accountStyle.badge}>
                          {accountStyle.label}
                        </span>
                        <p className="mt-1 text-slate-400">{formatAge(account.minutes_since_last_snapshot)}</p>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                      <p>Balance: {account.balance === null ? '—' : fmt(account.balance)}</p>
                      <p>Equity: {account.equity === null ? '—' : fmt(account.equity)}</p>
                      <p>Open: {account.open_positions ?? '—'}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            {(error || (health?.issues || []).length > 0) && (
              <div className="mt-3 rounded-xl bg-white/75 p-3">
                <p className="mb-2 text-xs font-bold text-slate-700">Issues</p>
                <ul className="space-y-1 text-[11px] leading-relaxed text-slate-500">
                  {error && <li>• {error}</li>}
                  {(health?.issues || []).slice(0, 5).map((issue, idx) => (
                    <li key={idx}>• {issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
              Auto refresh mỗi 60 giây. Healthy ≤ 75 phút · Warning 75–120 phút · Critical &gt; 120 phút.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now = new Date()
  const tradingToday = getCurrentTradingDate(now)
  const todayISO = toISODate(tradingToday)
  const firstOfMonthISO = toISODate(new Date(tradingToday.getFullYear(), tradingToday.getMonth(), 1))

  const [email, setEmail]       = useState<string | null | undefined>(undefined)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [healthExpanded, setHealthExpanded] = useState(false)

  // Timeline preset dùng chung cho Tổng quan, bảng tài khoản và biểu đồ.
  // Lifetime = metrics/table lấy all-time; các preset khác = lọc theo startDate/endDate.
  const [timelinePreset, setTimelinePreset] = useState<TimelinePreset>('lifetime')
  const viewMode: 'lifetime' | 'range' = timelinePreset === 'lifetime' ? 'lifetime' : 'range'

  const [startDate, setStartDate] = useState(firstOfMonthISO)
  const [endDate, setEndDate]     = useState(todayISO)

  // Dữ liệu chart (Equity / PnL theo ngày) — vẫn merge nhiều tháng theo range đã chọn
  const [equityData, setEquityData]     = useState<Record<string, DailyEquityPoint[]>>({})
  const [pnlData, setPnlData]           = useState<Record<string, DailyPnLPoint[]>>({})
  const [chartLoading, setChartLoading] = useState(false)
  const [chartAccount, setChartAccount] = useState('all')

  // Dữ liệu cho bảng tài khoản: operations (deposit/withdraw) + raw deals (profit/commission/swap)
  const [operations, setOperations] = useState<Record<string, BaselineOperation[]>>({})
  const [rawDeals, setRawDeals]     = useState<Record<string, DealRow[]>>({})
  const [tableLoading, setTableLoading] = useState(false)


  // Exness Partner Commission add-on — tách riêng, không thay đổi logic trading hiện tại
  const [exnessRows, setExnessRows] = useState<ExnessAccountReward[]>([])
  const [exnessLoading, setExnessLoading] = useState(false)
  const [exnessError, setExnessError] = useState<string | null>(null)

  function handlePresetChange(preset: TimelinePreset) {
    setTimelinePreset(preset)

    if (preset === 'custom') return

    const range = getPresetDateRange(preset, new Date())
    setStartDate(range.start)
    setEndDate(range.end)
  }

  function handleStartChange(v: string) {
    setTimelinePreset('custom')
    setStartDate(v)
  }

  function handleEndChange(v: string) {
    setTimelinePreset('custom')
    setEndDate(v)
  }

  // Step 1 — email từ CF cookie
  useEffect(() => {
    setEmail(getEmailFromCookie())
  }, [])

  // Step 2 — fetch overview (real-time)
  useEffect(() => {
    if (email === undefined) return
    if (email === null) { setLoading(false); return }
    const load = async () => {
      try {
        const res = await fetch(API_URL + '/api/overview?api_key=' + API_KEY)
        if (!res.ok) throw new Error('API error')
        const data: Overview = await res.json()
        setOverview(data)
        const allowed = getAllowedLogins(email)
        setAccounts(
          allowed === 'all'
            ? data.accounts
            : data.accounts.filter(a => allowed.includes(a.login))
        )
      } catch {
        setError('Không thể kết nối đến API. Vui lòng thử lại.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [email])

  // Health Check — gọi endpoint backend /api/health, auto refresh mỗi 60 giây
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true)
    try {
      const res = await fetch(API_URL + '/api/health?api_key=' + API_KEY, { cache: 'no-store' })
      if (!res.ok) throw new Error('Health API error')
      const data: HealthResponse = await res.json()
      setHealth(data)
      setHealthError(null)
    } catch {
      setHealthError('Không thể kết nối tới /api/health. Kiểm tra API service hoặc Cloudflare Tunnel.')
    } finally {
      setHealthLoading(false)
    }
  }, [])

  useEffect(() => {
    if (email === undefined || email === null) return
    fetchHealth()
    const timer = window.setInterval(fetchHealth, 60000)
    return () => window.clearInterval(timer)
  }, [email, fetchHealth])

  // Step 3 — fetch + merge daily-equity / daily-pnl cho biểu đồ (theo range đã chọn)
  const fetchChartData = useCallback(async (start: string, end: string) => {
    if (!start || !end || start > end) return
    setChartLoading(true)
    try {
      const months = getMonthsInRange(start, end)
      const results = await Promise.all(
        months.map(({ year, month }) =>
          Promise.all([
            fetch(API_URL + '/api/daily-equity?api_key=' + API_KEY + '&year=' + year + '&month=' + month).then(r => r.json()),
            fetch(API_URL + '/api/daily-pnl?api_key='    + API_KEY + '&year=' + year + '&month=' + month).then(r => r.json()),
          ])
        )
      )
      const mergedEquity: Record<string, DailyEquityPoint[]> = {}
      const mergedPnl: Record<string, DailyPnLPoint[]>       = {}
      for (const [eqJson, pnlJson] of results) {
        const eqD  = eqJson.data  || {}
        const pnlD = pnlJson.data || {}
        for (const label of Object.keys(eqD)) {
          if (!mergedEquity[label]) mergedEquity[label] = []
          mergedEquity[label].push(...eqD[label])
        }
        for (const label of Object.keys(pnlD)) {
          if (!mergedPnl[label]) mergedPnl[label] = []
          mergedPnl[label].push(...pnlD[label])
        }
      }
      for (const label of Object.keys(mergedEquity)) {
        mergedEquity[label] = mergedEquity[label].filter(d => d.date >= start && d.date <= end)
      }
      for (const label of Object.keys(mergedPnl)) {
        mergedPnl[label] = mergedPnl[label].filter(d => d.date >= start && d.date <= end)
      }
      setEquityData(mergedEquity)
      setPnlData(mergedPnl)
    } catch {
      // silent
    } finally {
      setChartLoading(false)
    }
  }, [])

  useEffect(() => {
    if (email && email !== null) fetchChartData(startDate, endDate)
  }, [email, startDate, endDate, fetchChartData])

  // Step 4 — fetch deposit/withdrawal operations (toàn bộ, có timestamp) — 1 lần khi có accounts
  useEffect(() => {
    if (!accounts.length) return
    const loadOps = async () => {
      try {
        const res = await fetch(API_URL + '/api/baseline?api_key=' + API_KEY)
        const json: BaselineResponse = await res.json()
        const baselines = json.baselines || {}
        const opsMap: Record<string, BaselineOperation[]> = {}
        for (const label of Object.keys(baselines)) {
          opsMap[label] = baselines[label].operations || []
        }
        setOperations(opsMap)
      } catch {
        // silent
      }
    }
    loadOps()
  }, [accounts])

  // Step 5 — fetch raw deals (profit/commission/swap tách riêng) cho từng account đã phân quyền
  const fetchRawDeals = useCallback(async (accs: Account[], start: string, end: string, mode: 'lifetime' | 'range') => {
    if (!accs.length) return
    setTableLoading(true)
    try {
      const results = await Promise.all(
        accs.map(a => {
          const url =
            mode === 'lifetime'
              ? API_URL + '/api/deals?api_key=' + API_KEY + '&account=' + a.login + '&days=3650&limit=10000'
              : API_URL + '/api/deals?api_key=' + API_KEY + '&account=' + a.login + '&date_from=' + start + '&date_to=' + end + '&limit=10000'
          return fetch(url)
            .then(r => r.json())
            .then((json: DealsResponse) => ({ label: a.label, deals: json.deals || [] }))
        })
      )
      const map: Record<string, DealRow[]> = {}
      for (const { label, deals } of results) {
        map[label] = deals
      }
      setRawDeals(map)
    } catch {
      // silent
    } finally {
      setTableLoading(false)
    }
  }, [])

  useEffect(() => {
    if (accounts.length) fetchRawDeals(accounts, startDate, endDate, viewMode)
  }, [accounts, startDate, endDate, viewMode, fetchRawDeals])


  const fetchExnessRewards = useCallback(async (start: string, end: string, mode: 'lifetime' | 'range') => {
    setExnessLoading(true)
    try {
      const query = mode === 'lifetime'
        ? '&days=3650'
        : '&date_from=' + start + '&date_to=' + end

      const byAccountRes = await fetch(API_URL + '/api/exness/rewards/by-account?api_key=' + API_KEY + query, { cache: 'no-store' })

      if (!byAccountRes.ok) throw new Error('Exness API error')

      const byAccountJson: ExnessByAccountResponse = await byAccountRes.json()

      setExnessRows(byAccountJson.items || [])
      setExnessError(null)
    } catch {
      setExnessError('Chưa tải được Exness commission. Kiểm tra backend hoặc sync collector.')
      setExnessRows([])
    } finally {
      setExnessLoading(false)
    }
  }, [])

  useEffect(() => {
    if (accounts.length) fetchExnessRewards(startDate, endDate, viewMode)
  }, [accounts, startDate, endDate, viewMode, fetchExnessRewards])

  // ─── Derived ─────────────────────────────────────────────────────────────

  // Per-account: Net Deposit / Net Withdraw / PNL / Commission — theo viewMode đã chọn
  const accountMetrics: Record<string, AccountMetric> = accounts.reduce((map, a) => {
    const ops   = operations[a.label] || []
    const deals = rawDeals[a.label]   || []

    let netDeposit = 0
    let netWithdraw = 0
    for (const o of ops) {
      if (!inRange(o.time, viewMode, startDate, endDate)) continue
      if (o.type === 'DEPOSIT') netDeposit += o.amount
      else netWithdraw += o.amount
    }

    let pnl = 0
    let commission = 0
    for (const d of deals) {
      if (!inRange(d.deal_time, viewMode, startDate, endDate)) continue
      pnl += d.profit + d.swap
      commission += d.commission
    }

    const finalProfit = getFinalProfit(pnl, commission)

    map[a.label] = {
      netDeposit:   round2(netDeposit),
      netWithdraw:  round2(netWithdraw),
      pnl:          round2(pnl),
      commission:   round2(commission),
      finalProfit:  round2(finalProfit),
    }
    return map
  }, {} as Record<string, AccountMetric>)

  const metricTotals = accounts.reduce(
    (acc, a) => {
      const m = accountMetrics[a.label] || {
        netDeposit: 0,
        netWithdraw: 0,
        pnl: 0,
        commission: 0,
        finalProfit: 0,
      }

      return {
        netDeposit:  acc.netDeposit  + m.netDeposit,
        netWithdraw: acc.netWithdraw + m.netWithdraw,
        pnl:         acc.pnl         + m.pnl,
        commission:  acc.commission  + m.commission,
        finalProfit: acc.finalProfit + m.finalProfit,
        balance:     acc.balance     + a.balance,
      }
    },
    { netDeposit: 0, netWithdraw: 0, pnl: 0, commission: 0, finalProfit: 0, balance: 0 }
  )

  const timelineLabel = getTimelineLabel(timelinePreset, startDate, endDate)

  // Accounts hiển thị trên chart
  const chartLabels =
    chartAccount === 'all'
      ? accounts.map(a => a.label)
      : accounts.some(a => a.label === chartAccount) ? [chartAccount] : []

  const chartRangeStats = (() => {
    const totalPnL = chartLabels.reduce((sum, label) => {
      return sum + (pnlData[label] || []).reduce((s, d) => s + (d.pnl || 0), 0)
    }, 0)
    const totalDeals = chartLabels.reduce((sum, label) => {
      return sum + (pnlData[label] || []).reduce((s, d) => s + (d.deal_count || 0), 0)
    }, 0)
    const lastBalance = chartLabels.reduce((sum, label) => {
      const pts = equityData[label] || []
      const last = [...pts].reverse().find(d => d.balance !== null)
      return sum + (last?.balance || 0)
    }, 0)
    return { totalPnL, totalDeals, lastBalance }
  })()

  const equityChartData = (() => {
    const keys = Object.keys(equityData)
    if (!keys.length) return []
    const allDates = equityData[keys[0]]?.map(d => d.date) || []
    const rows = allDates.map(date => {
      const row: Record<string, string | number | null> = { date: date.slice(5) }
      for (const label of chartLabels) {
        const pt = equityData[label]?.find(d => d.date === date)
        row[label] = pt?.equity ?? null
      }
      return row
    })
    return rows.filter(row => chartLabels.some(l => row[l] !== null && row[l] !== undefined))
  })()

  const pnlChartData = (() => {
    const keys = Object.keys(pnlData)
    if (!keys.length) return []
    const allDates = pnlData[keys[0]]?.map(d => d.date) || []
    const rows = allDates.map(date => {
      const row: Record<string, string | number | null> = { date: date.slice(5) }
      for (const label of chartLabels) {
        const pt = pnlData[label]?.find(d => d.date === date)
        row[label] = pt?.pnl ?? null
      }
      return row
    })
    return rows.filter(row => chartLabels.some(l => row[l] !== null && row[l] !== undefined))
  })()

  const visibleHealthLogins = email && getAllowedLogins(email)

  // ─── Render states ────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  if (email === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 text-lg mb-2">Phiên đăng nhập hết hạn</p>
          <a href="/cdn-cgi/access/login/damquangloc.com" className="text-blue-600 underline text-sm">
            Đăng nhập lại
          </a>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-3">⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className="text-blue-600 underline text-sm">
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <HealthFloatingWidget
        health={health}
        error={healthError}
        loading={healthLoading}
        expanded={healthExpanded}
        visibleLogins={visibleHealthLogins || 'all'}
        onToggle={() => setHealthExpanded(v => !v)}
        onRefresh={fetchHealth}
      />

      {/* Header */}
      <header className="border-b border-slate-100 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900">MT5 Dashboard</h1>
            <p className="text-slate-400 text-xs">damquangloc.com</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end mb-1">
              <p className="text-sm text-slate-600">{email}</p>
              {email && isAdmin(email) && (
                <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full">Admin</span>
              )}
            </div>
            <p className="text-xs text-slate-400 bg-slate-50 border border-slate-200 px-3 py-1 rounded-full inline-block">
              Cập nhật: {overview?.updated_at}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-12">

        {/* ── TỔNG QUAN ── */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Tổng quan</h2>

            <TimelineControls
              preset={timelinePreset}
              startDate={startDate}
              endDate={endDate}
              today={todayISO}
              onPresetChange={handlePresetChange}
              onStartChange={handleStartChange}
              onEndChange={handleEndChange}
            />
          </div>

          <TimeBasisInfoBar
            preset={timelinePreset}
            startDate={startDate}
            endDate={endDate}
          />

          {/* Stat cards — giữ nguyên metric trading hiện tại */}
          <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Net Deposit"
              value={tableLoading ? '...' : fmt(metricTotals.netDeposit)}
              sub={timelineLabel}
            />
            <StatCard
              label="Net Withdraw"
              value={tableLoading ? '...' : fmt(metricTotals.netWithdraw)}
              sub={timelineLabel}
            />
            <StatCard
              label="PNL"
              value={tableLoading ? '...' : fmtPnL(metricTotals.pnl)}
              color={metricTotals.pnl >= 0 ? 'green' : 'red'}
            />
            <StatCard
              label="Commission"
              value={tableLoading ? '...' : fmt(metricTotals.commission)}
              color="neutral"
            />
            <StatCard
              label="Final Profit"
              value={tableLoading ? '...' : fmtPnL(metricTotals.finalProfit)}
              sub="PNL + Commission"
              color={metricTotals.finalProfit >= 0 ? 'green' : 'red'}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.9fr)] gap-4 items-start">
            {/* Account table — format cố định: Net Deposit / Net Withdraw / Actual Balance / PNL / Commission / Final Profit */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Tài khoản ({accounts.length})</h3>
              <span className="text-xs text-slate-400">
                {timelineLabel}
              </span>
            </div>

            {accounts.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-400">
                Không có tài khoản nào được phân quyền
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase border-b border-slate-100">
                      <th className="px-6 py-3 text-left">Tài khoản</th>
                      <th className="px-6 py-3 text-right">Net Deposit</th>
                      <th className="px-6 py-3 text-right">Net Withdraw</th>
                      <th className="px-6 py-3 text-right">Actual Balance</th>
                      <th className="px-6 py-3 text-right">PNL</th>
                      <th className="px-6 py-3 text-right">Commission</th>
                      <th className="px-6 py-3 text-right">Final Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(a => {
                      const m = accountMetrics[a.label] || { netDeposit: 0, netWithdraw: 0, pnl: 0, commission: 0, finalProfit: 0 }
                      return (
                        <tr key={a.login} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[a.label] || '#94a3b8' }} />
                              <div>
                                <p className="font-medium text-slate-900">{a.label}</p>
                                <p className="text-xs text-slate-400">{a.login}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right text-slate-700">
                            {tableLoading ? '...' : fmt(m.netDeposit, a.currency)}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-700">
                            {tableLoading ? '...' : fmt(m.netWithdraw, a.currency)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-slate-900">
                            {fmt(a.balance, a.currency)}
                          </td>
                          <td className={'px-6 py-4 text-right font-semibold ' + (tableLoading ? 'text-slate-400' : m.pnl >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                            {tableLoading ? '...' : fmtPnL(m.pnl)}
                          </td>
                          <td className="px-6 py-4 text-right text-slate-500">
                            {tableLoading ? '...' : fmt(m.commission, a.currency)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {tableLoading ? (
                              <span className="text-slate-400">...</span>
                            ) : (
                              <span
                                className={
                                  'inline-flex justify-end rounded-lg px-3 py-1 font-bold ' +
                                  (m.finalProfit >= 0
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-red-100 text-red-700')
                                }
                              >
                                {fmtPnL(m.finalProfit)}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 font-semibold text-slate-900 border-t border-slate-200">
                      <td className="px-6 py-3">Tổng</td>
                      <td className="px-6 py-3 text-right">{tableLoading ? '...' : fmt(metricTotals.netDeposit)}</td>
                      <td className="px-6 py-3 text-right">{tableLoading ? '...' : fmt(metricTotals.netWithdraw)}</td>
                      <td className="px-6 py-3 text-right">{fmt(metricTotals.balance)}</td>
                      <td className={'px-6 py-3 text-right ' + (tableLoading ? '' : metricTotals.pnl >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                        {tableLoading ? '...' : fmtPnL(metricTotals.pnl)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-500">
                        {tableLoading ? '...' : fmt(metricTotals.commission)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {tableLoading ? (
                          <span className="text-slate-400">...</span>
                        ) : (
                          <span
                            className={
                              'inline-flex justify-end rounded-lg px-3 py-1 font-bold ' +
                              (metricTotals.finalProfit >= 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800')
                            }
                          >
                            {fmtPnL(metricTotals.finalProfit)}
                          </span>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            </div>

            <ExnessCommissionPanel
              accounts={accounts}
              rows={exnessRows}
              loading={exnessLoading}
              error={exnessError}
            />
          </div>

        </section>

        {/* ── PHÂN TÍCH THEO TIMELINE ── */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Phân tích</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <select
                value={chartAccount}
                onChange={e => setChartAccount(e.target.value)}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white outline-none focus:border-slate-400"
              >
                <option value="all">Tất cả tài khoản</option>
                {accounts.map(a => (
                  <option key={a.login} value={a.label}>{a.label}</option>
                ))}
              </select>
              <TimelineControls
                preset={timelinePreset}
                startDate={startDate}
                endDate={endDate}
                today={todayISO}
                onPresetChange={handlePresetChange}
                onStartChange={handleStartChange}
                onEndChange={handleEndChange}
              />
            </div>
          </div>

          {chartLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              Đang tải biểu đồ...
            </div>
          ) : (
            <div className="space-y-6">

              {/* Equity Chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
                  Equity theo ngày
                </p>
                {equityChartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                    Không có dữ liệu equity cho khoảng thời gian này
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={equityChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => '$' + (v / 1000).toFixed(1) + 'k'}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [v != null ? fmt(Number(v)) : '—', '']}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#64748b', paddingTop: 8 }} />
                      {chartLabels.map(label => (
                        <Line
                          key={label}
                          type="monotone"
                          dataKey={label}
                          stroke={COLORS[label] || '#94a3b8'}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* PnL Chart */}
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-5">
                  PnL thực hiện theo ngày
                </p>
                {pnlChartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                    Không có dữ liệu PnL cho khoảng thời gian này
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={pnlChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} />
                      <YAxis
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => '$' + v}
                        width={55}
                      />
                      <ReferenceLine y={0} stroke="#cbd5e1" strokeDasharray="4 2" />
                      <Tooltip
                        contentStyle={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [v != null ? fmtPnL(Number(v)) : '—', '']}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#64748b', paddingTop: 8 }} />
                      {chartLabels.map(label => (
                        <Line
                          key={label}
                          type="monotone"
                          dataKey={label}
                          stroke={COLORS[label] || '#94a3b8'}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          connectNulls={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard label="Balance cuối kỳ" value={fmt(chartRangeStats.lastBalance)} />
                <StatCard
                  label="PnL trong kỳ"
                  value={fmtPnL(chartRangeStats.totalPnL)}
                  color={chartRangeStats.totalPnL >= 0 ? 'green' : 'red'}
                />
                <StatCard label="Số lệnh đã đóng" value={chartRangeStats.totalDeals + ' lệnh'} />
              </div>

            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-300 pb-4">
          Dữ liệu cập nhật tự động mỗi giờ
        </p>
      </main>
    </div>
  )
}
