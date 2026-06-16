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
  total_balance: number
  total_equity: number
  total_baseline: number
  total_pnl_vs_baseline: number
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string
  value: string
  sub?: string
  color?: 'green' | 'red' | 'white'
}) {
  const colorClass =
    color === 'green' ? 'text-emerald-400' :
    color === 'red'   ? 'text-red-400'     : 'text-white'
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={'text-2xl font-bold ' + colorClass}>{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const now = new Date()

  const [email, setEmail]       = useState<string | null | undefined>(undefined)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState<string | null>(null)

  // View mode: 'overall' = tổng thể real-time, 'monthly' = xem theo tháng
  const [viewMode, setViewMode] = useState<'overall' | 'monthly'>('overall')

  // Month/year — dùng chung cho cả 2 section
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  // Chart data
  const [equityData, setEquityData]     = useState<Record<string, DailyEquityPoint[]>>({})
  const [pnlData, setPnlData]           = useState<Record<string, DailyPnLPoint[]>>({})
  const [chartLoading, setChartLoading] = useState(false)

  // Chart account selector (section 2)
  const [chartAccount, setChartAccount] = useState('all')

  // Step 1 — email từ CF cookie
  useEffect(() => {
    setEmail(getEmailFromCookie())
  }, [])

  // Step 2 — fetch overview
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

  // Step 3 — fetch chart data khi đổi tháng/năm
  const fetchChartData = useCallback(async (y: number, m: number) => {
    setChartLoading(true)
    try {
      const [eqRes, pnlRes] = await Promise.all([
        fetch(API_URL + '/api/daily-equity?api_key=' + API_KEY + '&year=' + y + '&month=' + m),
        fetch(API_URL + '/api/daily-pnl?api_key='    + API_KEY + '&year=' + y + '&month=' + m),
      ])
      const eqJson  = await eqRes.json()
      const pnlJson = await pnlRes.json()
      setEquityData(eqJson.data  || {})
      setPnlData(pnlJson.data    || {})
    } catch {
      // silent
    } finally {
      setChartLoading(false)
    }
  }, [])

  useEffect(() => {
    if (email && email !== null) fetchChartData(year, month)
  }, [email, year, month, fetchChartData])

  // Khi bấm mũi tên tháng → tự chuyển sang monthly mode
  function handleMonthChange(y: number, m: number) {
    setYear(y)
    setMonth(m)
    setViewMode('monthly')
  }

  // ─── Derived ─────────────────────────────────────────────────────────────

  // Totals real-time (overall mode)
  const totals = accounts.reduce(
    (acc, a) => ({
      balance:  acc.balance  + a.balance,
      equity:   acc.equity   + a.equity,
      baseline: acc.baseline + a.baseline,
      pnl:      acc.pnl      + a.pnl_vs_baseline,
      floating: acc.floating + a.floating_pnl,
    }),
    { balance: 0, equity: 0, baseline: 0, pnl: 0, floating: 0 }
  )

  // Monthly stats — TẤT CẢ accounts (cho Tổng quan monthly mode)
  const overviewMonthlyStats = (() => {
    const allLabels = accounts.map(a => a.label)
    const totalPnL = allLabels.reduce((sum, label) => {
      return sum + (pnlData[label] || []).reduce((s, d) => s + (d.pnl || 0), 0)
    }, 0)
    const totalDeals = allLabels.reduce((sum, label) => {
      return sum + (pnlData[label] || []).reduce((s, d) => s + (d.deal_count || 0), 0)
    }, 0)
    const lastEquity = allLabels.reduce((sum, label) => {
      const pts = equityData[label] || []
      const last = [...pts].reverse().find(d => d.equity !== null)
      return sum + (last?.equity || 0)
    }, 0)
    const lastBalance = allLabels.reduce((sum, label) => {
      const pts = equityData[label] || []
      const last = [...pts].reverse().find(d => d.balance !== null)
      return sum + (last?.balance || 0)
    }, 0)
    return { totalPnL, totalDeals, lastEquity, lastBalance }
  })()

  // Accounts hiển thị trên chart (section 2)
  const chartLabels =
    chartAccount === 'all'
      ? accounts.map(a => a.label)
      : accounts.some(a => a.label === chartAccount) ? [chartAccount] : []

  // Monthly stats cho section 2 (theo chartLabels)
  const chartMonthlyStats = (() => {
    const totalPnL = chartLabels.reduce((sum, label) => {
      return sum + (pnlData[label] || []).reduce((s, d) => s + (d.pnl || 0), 0)
    }, 0)
    const totalDeals = chartLabels.reduce((sum, label) => {
      return sum + (pnlData[label] || []).reduce((s, d) => s + (d.deal_count || 0), 0)
    }, 0)
    const lastEquity = chartLabels.reduce((sum, label) => {
      const pts = equityData[label] || []
      const last = [...pts].reverse().find(d => d.equity !== null)
      return sum + (last?.equity || 0)
    }, 0)
    return { totalPnL, totalDeals, lastEquity }
  })()

  // Equity chart data — bỏ ngày tất cả null
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

  // PnL chart data — bỏ ngày tất cả null
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Đang tải dữ liệu...</p>
        </div>
      </div>
    )
  }

  if (email === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-300 text-lg mb-2">Phiên đăng nhập hết hạn</p>
          <a href="/cdn-cgi/access/login/damquangloc.com" className="text-blue-400 underline text-sm">Đăng nhập lại</a>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-3">⚠️ {error}</p>
          <button onClick={() => window.location.reload()} className="text-blue-400 underline text-sm">
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-900 text-white">

      {/* Header */}
      <header className="border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-tight">MT5 Dashboard</h1>
            <p className="text-slate-500 text-xs">damquangloc.com</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              <p className="text-sm text-slate-300">{email}</p>
              {email && isAdmin(email) && (
                <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">Admin</span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">Cập nhật: {overview?.updated_at}</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-10">

        {/* ── TỔNG QUAN ── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tổng quan</h2>

            {/* Controls: Overall button + Month nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('overall')}
                className={
                  'text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ' +
                  (viewMode === 'overall'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-400 hover:text-slate-200')
                }
              >
                Tổng thể
              </button>

              {/* Month nav */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const newMonth = month === 1 ? 12 : month - 1
                    const newYear  = month === 1 ? year - 1 : year
                    handleMonthChange(newYear, newMonth)
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
                >
                  ←
                </button>
                <span
                  className={
                    'text-sm font-semibold w-20 text-center cursor-pointer ' +
                    (viewMode === 'monthly' ? 'text-blue-400' : 'text-slate-400')
                  }
                  onClick={() => setViewMode('monthly')}
                >
                  {'T' + month + '/' + year}
                </span>
                <button
                  onClick={() => {
                    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
                    if (isCurrentMonth) return
                    const newMonth = month === 12 ? 1  : month + 1
                    const newYear  = month === 12 ? year + 1 : year
                    handleMonthChange(newYear, newMonth)
                  }}
                  disabled={year === now.getFullYear() && month === now.getMonth() + 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {/* Stat cards — đổi theo viewMode */}
          {viewMode === 'overall' ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard label="Tổng Balance" value={fmt(totals.balance)} />
              <StatCard label="Tổng Equity"  value={fmt(totals.equity)} sub="Thời gian thực" />
              <StatCard label="Net Deposit"  value={fmt(totals.baseline)} sub="Tổng vốn đã nạp" />
              <StatCard
                label="PnL vs Baseline"
                value={fmtPnL(totals.pnl) + ' (' + fmtPct(totals.pnl, totals.baseline) + ')'}
                color={totals.pnl >= 0 ? 'green' : 'red'}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <StatCard
                label={'Balance T' + month + '/' + year}
                value={chartLoading ? '...' : fmt(overviewMonthlyStats.lastBalance)}
                sub="Cuối tháng"
              />
              <StatCard
                label={'Equity T' + month + '/' + year}
                value={chartLoading ? '...' : fmt(overviewMonthlyStats.lastEquity)}
                sub="Cuối tháng"
              />
              <StatCard
                label={'PnL T' + month + '/' + year}
                value={chartLoading ? '...' : fmtPnL(overviewMonthlyStats.totalPnL)}
                color={overviewMonthlyStats.totalPnL >= 0 ? 'green' : 'red'}
              />
              <StatCard
                label="Số lệnh"
                value={chartLoading ? '...' : overviewMonthlyStats.totalDeals + ' lệnh'}
                sub={'Tháng ' + month + '/' + year}
              />
            </div>
          )}

          {/* Account table — luôn show real-time */}
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
              <h2 className="font-semibold text-slate-200">Tài khoản ({accounts.length})</h2>
              {totals.floating !== 0 && (
                <span className={'text-sm font-medium ' + (totals.floating >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  Floating: {fmtPnL(totals.floating)}
                </span>
              )}
            </div>

            {accounts.length === 0 ? (
              <div className="px-6 py-12 text-center text-slate-500">
                Không có tài khoản nào được phân quyền
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-500 uppercase border-b border-slate-700">
                      <th className="px-6 py-3 text-left">Tài khoản</th>
                      <th className="px-6 py-3 text-right">Balance</th>
                      <th className="px-6 py-3 text-right">Equity</th>
                      <th className="px-6 py-3 text-right">Floating</th>
                      <th className="px-6 py-3 text-right">Net Deposit</th>
                      <th className="px-6 py-3 text-right">PnL</th>
                      <th className="px-6 py-3 text-right">Lệnh mở</th>
                      <th className="px-6 py-3 text-right">Đòn bẩy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map(a => (
                      <tr key={a.login} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[a.label] || '#94a3b8' }} />
                            <div>
                              <p className="font-medium text-slate-200">{a.label}</p>
                              <p className="text-xs text-slate-500">{a.login}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-300">{fmt(a.balance, a.currency)}</td>
                        <td className="px-6 py-4 text-right text-slate-300">{fmt(a.equity, a.currency)}</td>
                        <td className={'px-6 py-4 text-right ' + (a.floating_pnl >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {fmtPnL(a.floating_pnl)}
                        </td>
                        <td className="px-6 py-4 text-right text-slate-300">{fmt(a.baseline)}</td>
                        <td className={'px-6 py-4 text-right font-semibold ' + (a.pnl_vs_baseline >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                          {fmtPnL(a.pnl_vs_baseline)}
                          <span className="text-xs font-normal ml-1 opacity-60">
                            {'(' + fmtPct(a.pnl_vs_baseline, a.baseline) + ')'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-slate-300">{a.open_positions}</td>
                        <td className="px-6 py-4 text-right text-slate-400">{'1:' + a.leverage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* ── PHÂN TÍCH THEO THÁNG ── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              {'Phân tích T' + month + '/' + year}
            </h2>
            <div className="flex items-center gap-3">
              <select
                value={chartAccount}
                onChange={e => setChartAccount(e.target.value)}
                className="text-sm bg-slate-700 border border-slate-600 rounded-lg px-3 py-1.5 text-slate-200 outline-none"
              >
                <option value="all">Tất cả tài khoản</option>
                {accounts.map(a => (
                  <option key={a.login} value={a.label}>{a.label}</option>
                ))}
              </select>

              {/* Month nav — sync với section 1 */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    const newMonth = month === 1 ? 12 : month - 1
                    const newYear  = month === 1 ? year - 1 : year
                    handleMonthChange(newYear, newMonth)
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors"
                >
                  ←
                </button>
                <span className="text-sm font-semibold text-slate-200 w-20 text-center">
                  {'T' + month + '/' + year}
                </span>
                <button
                  onClick={() => {
                    const isCurrentMonth = year === now.getFullYear() && month === now.getMonth() + 1
                    if (isCurrentMonth) return
                    const newMonth = month === 12 ? 1 : month + 1
                    const newYear  = month === 12 ? year + 1 : year
                    handleMonthChange(newYear, newMonth)
                  }}
                  disabled={year === now.getFullYear() && month === now.getMonth() + 1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  →
                </button>
              </div>
            </div>
          </div>

          {chartLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
              Đang tải biểu đồ...
            </div>
          ) : (
            <div className="space-y-6">

              {/* Equity Chart */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-5">
                  Equity theo ngày
                </p>
                {equityChartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                    Không có dữ liệu equity cho tháng này
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={equityChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => '$' + (v / 1000).toFixed(1) + 'k'}
                        width={55}
                      />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [v != null ? fmt(Number(v)) : '—', '']}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
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
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-5">
                  PnL thực hiện theo ngày
                </p>
                {pnlChartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                    Không có dữ liệu PnL cho tháng này
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={pnlChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                      <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} tickLine={false} />
                      <YAxis
                        tick={{ fill: '#64748b', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={v => '$' + v}
                        width={55}
                      />
                      <ReferenceLine y={0} stroke="#475569" strokeDasharray="4 2" />
                      <Tooltip
                        contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [v != null ? fmtPnL(Number(v)) : '—', '']}
                      />
                      <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }} />
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

              {/* Monthly summary */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="Equity cuối tháng" value={fmt(chartMonthlyStats.lastEquity)} />
                <StatCard
                  label={'PnL T' + month + '/' + year}
                  value={fmtPnL(chartMonthlyStats.totalPnL)}
                  color={chartMonthlyStats.totalPnL >= 0 ? 'green' : 'red'}
                />
                <StatCard label="Số lệnh đã đóng" value={chartMonthlyStats.totalDeals + ' lệnh'} />
              </div>

            </div>
          )}
        </section>

        <p className="text-center text-xs text-slate-700 pb-4">
          Dữ liệu cập nhật tự động mỗi giờ
        </p>
      </main>
    </div>
  )
}
