'use client'

import { useEffect, useState } from 'react'
import { getAllowedLogins, isAdmin } from '@/lib/account-mapping'

const API_URL = 'https://api.damquangloc.com'
const API_KEY = 'mt5dashboard2026'

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

function getEmailFromCookie(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const cfCookie = document.cookie
      .split(';')
      .find(c => c.trim().startsWith('CF_Authorization='))
    if (!cfCookie) return null
    const jwt = cfCookie.split('=').slice(1).join('=').trim()
    const parts = jwt.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
    )
    return payload.email || null
  } catch {
    return null
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
  return `${value >= 0 ? '+' : ''}${fmt(value)}`
}

function fmtPct(pnl: number, baseline: number): string {
  if (baseline === 0) return '—'
  return `${((pnl / baseline) * 100).toFixed(1)}%`
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: 'green' | 'red' | 'white'
}) {
  const colors = {
    green: 'text-emerald-400',
    red: 'text-red-400',
    white: 'text-white',
  }
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">{label}</p>
      <p className={`text-2xl font-bold ${colors[color ?? 'white']}`}>{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const [email, setEmail] = useState<string | null | undefined>(undefined)
  const [overview, setOverview] = useState<Overview | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Bước 1 — đọc email từ cookie CF_Authorization
  useEffect(() => {
    setEmail(getEmailFromCookie())
  }, [])

  // Bước 2 — fetch API sau khi có email
  useEffect(() => {
    if (email === undefined) return
    if (email === null) {
      setLoading(false)
      return
    }

    const load = async () => {
      try {
        const res = await fetch(
          `${API_URL}/api/overview?api_key=${API_KEY}`
        )
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

  const totals = accounts.reduce(
    (acc, a) => ({
      balance: acc.balance + a.balance,
      equity: acc.equity + a.equity,
      baseline: acc.baseline + a.baseline,
      pnl: acc.pnl + a.pnl_vs_baseline,
      floating: acc.floating + a.floating_pnl,
    }),
    { balance: 0, equity: 0, baseline: 0, pnl: 0, floating: 0 }
  )

  // --- Loading ---
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

  // --- Not authenticated ---
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

  // --- Error ---
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-3">⚠️ {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="text-blue-400 underline text-sm"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  // --- Dashboard ---
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
                <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full">
                  Admin
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              Cập nhật: {overview?.updated_at}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Tổng Balance" value={fmt(totals.balance)} />
          <StatCard label="Tổng Equity" value={fmt(totals.equity)} />
          <StatCard label="Net Deposit" value={fmt(totals.baseline)} />
          <StatCard
            label="PnL vs Baseline"
            value={`${fmtPnL(totals.pnl)} (${fmtPct(totals.pnl, totals.baseline)})`}
            color={totals.pnl >= 0 ? 'green' : 'red'}
          />
        </div>

        {/* Table */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-semibold text-slate-200">
              Tài khoản ({accounts.length})
            </h2>
            {totals.floating !== 0 && (
              <span
                className={`text-sm font-medium ${
                  totals.floating >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
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
                    <tr
                      key={a.login}
                      className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <p className="font-medium text-slate-200">{a.label}</p>
                        <p className="text-xs text-slate-500">{a.login}</p>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300">
                        {fmt(a.balance, a.currency)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300">
                        {fmt(a.equity, a.currency)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right ${
                          a.floating_pnl >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {fmtPnL(a.floating_pnl)}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300">
                        {fmt(a.baseline)}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          a.pnl_vs_baseline >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        {fmtPnL(a.pnl_vs_baseline)}
                        <span className="text-xs font-normal ml-1 opacity-60">
                          ({fmtPct(a.pnl_vs_baseline, a.baseline)})
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-300">
                        {a.open_positions}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-400">
                        1:{a.leverage}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-700">
          Dữ liệu cập nhật tự động mỗi giờ
        </p>
      </main>
    </div>
  )
}
