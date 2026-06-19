'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAllowedLogins, isAdmin } from '@/lib/account-mapping'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts'

const API_URL = 'https://api.damquangloc.com'
const API_KEY = 'mt5dashboard2026'

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

interface AccountMetric {
  netDeposit: number
  netWithdraw: number
  pnl: number
  commission: number
}

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

function fmtPct(pnl: number, baseline: number): string {
  if (baseline === 0) return '—'
  return ((pnl / baseline) * 100).toFixed(1) + '%'
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
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

// Có nằm trong khoảng đã chọn không — 'overall' = luôn true (lấy hết, all-time)
function inRange(timeStr: string, mode: 'overall' | 'range', start: string, end: string): boolean {
  if (mode === 'overall') return true
  const d = timeStr.slice(0, 10)
  return d >= start && d <= end
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
  startDate, endDate, onStartChange, onEndChange, today,
}: {
  startDate: string
  endDate: string
  onStartChange: (v: string) => void
  onEndChange: (v: string) => void
  today: string
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="date"
        value={startDate}
        max={endDate}
        onChange={e => onStartChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white outline-none focus:border-slate-400"
      />
      <span className="text-slate-300 text-sm">→</span>
      <input
        type="date"
        value={endDate}
        min={startDate}
        max={today}
        onChange={e => onEndChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 text-slate-700 bg-white outline-none focus:border-slate-400"
      />
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now = new Date()
  const todayISO = toISODate(now)
  const firstOfMonthISO = toISODate(new Date(now.getFullYear(), now.getMonth(), 1))

  const [email, setEmail]       = useState<string | null | undefined>(undefined)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // 'overall' = lấy hết (all-time), 'range' = lọc theo khoảng ngày đã chọn
  const [viewMode, setViewMode] = useState<'overall' | 'range'>('overall')

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

  function handleStartChange(v: string) {
    setStartDate(v)
    setViewMode('range')
  }
  function handleEndChange(v: string) {
    setEndDate(v)
    setViewMode('range')
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
  const fetchRawDeals = useCallback(async (accs: Account[], start: string, mode: 'overall' | 'range') => {
    if (!accs.length) return
    setTableLoading(true)
    try {
      const daysBack =
        mode === 'overall'
          ? 3650
          : Math.max(2, Math.ceil((new Date(todayISO).getTime() - new Date(start).getTime()) / 86400000) + 2)

      const results = await Promise.all(
        accs.map(a =>
          fetch(API_URL + '/api/deals?api_key=' + API_KEY + '&account=' + a.login + '&days=' + daysBack)
            .then(r => r.json())
            .then((json: DealsResponse) => ({ label: a.label, deals: json.deals || [] }))
        )
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
  }, [todayISO])

  useEffect(() => {
    if (accounts.length) fetchRawDeals(accounts, startDate, viewMode)
  }, [accounts, startDate, viewMode, fetchRawDeals])

  // ─── Derived ─────────────────────────────────────────────────────────────

  const totals = accounts.reduce(
    (acc, a) => ({
      balance:  acc.balance  + a.balance,
      baseline: acc.baseline + a.baseline,
      pnl:      acc.pnl      + a.pnl_vs_baseline,
      floating: acc.floating + a.floating_pnl,
    }),
    { balance: 0, baseline: 0, pnl: 0, floating: 0 }
  )

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

    map[a.label] = {
      netDeposit:  round2(netDeposit),
      netWithdraw: round2(netWithdraw),
      pnl:         round2(pnl),
      commission:  round2(commission),
    }
    return map
  }, {} as Record<string, AccountMetric>)

  const metricTotals = accounts.reduce(
    (acc, a) => {
      const m = accountMetrics[a.label] || { netDeposit: 0, netWithdraw: 0, pnl: 0, commission: 0 }
      return {
        netDeposit:  acc.netDeposit  + m.netDeposit,
        netWithdraw: acc.netWithdraw + m.netWithdraw,
        pnl:         acc.pnl         + m.pnl,
        commission:  acc.commission  + m.commission,
        balance:     acc.balance     + a.balance,
      }
    },
    { netDeposit: 0, netWithdraw: 0, pnl: 0, commission: 0, balance: 0 }
  )

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

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('overall')}
                className={
                  'text-sm px-4 py-1.5 rounded-lg font-medium transition-colors ' +
                  (viewMode === 'overall'
                    ? 'bg-slate-900 text-white'
                    : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400')
                }
              >
                Total
              </button>
              <RangeControls
                startDate={startDate}
                endDate={endDate}
                onStartChange={handleStartChange}
                onEndChange={handleEndChange}
                today={todayISO}
              />
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard label="Tổng Balance" value={fmt(totals.balance)} sub="Thời gian thực" />
            <StatCard label="Net Deposit" value={fmt(totals.baseline)} sub="Tổng vốn đã nạp" />
            <StatCard
              label="PnL vs Baseline"
              value={fmtPnL(totals.pnl) + ' (' + fmtPct(totals.pnl, totals.baseline) + ')'}
              color={totals.pnl >= 0 ? 'green' : 'red'}
            />
          </div>

          {/* Account table — format cố định: Net Deposit / Net Withdraw / Actual Balance / PNL / Commission */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900">Tài khoản ({accounts.length})</h3>
              <span className="text-xs text-slate-400">
                {viewMode === 'overall' ? 'Toàn bộ thời gian' : formatDMY(startDate) + ' → ' + formatDMY(endDate)}
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
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(a => {
                      const m = accountMetrics[a.label] || { netDeposit: 0, netWithdraw: 0, pnl: 0, commission: 0 }
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
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── PHÂN TÍCH THEO KHOẢNG NGÀY ── */}
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
              <RangeControls
                startDate={startDate}
                endDate={endDate}
                onStartChange={handleStartChange}
                onEndChange={handleEndChange}
                today={todayISO}
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
