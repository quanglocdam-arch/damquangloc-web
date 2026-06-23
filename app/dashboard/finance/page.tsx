'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

const API_URL = 'https://api.damquangloc.com'
const API_KEY = 'mt5dashboard2026'

type RiskStatus = 'NORMAL' | 'LOW_PROFIT' | 'LOSS' | 'HIGH_LOSS' | 'SPLIT_ONLY'
type SettlementStatus = 'LIVE' | 'DRAFT' | 'LOCKED' | 'PAID'

interface FinanceSummary {
  account_count: number
  total_capital_base: number
  total_trading_profit: number
  total_base_return: number
  total_client_profit: number
  total_manager_profit: number
  total_loss_amount: number
  loss_accounts: number
  high_loss_accounts: number
  split_only_accounts: number
  settlement_status: {
    live: number
    draft: number
    locked: number
    paid: number
  }
}

interface FinanceItem {
  account_login: number
  account_label: string
  client_name: string | null
  period: string
  period_type: string
  onboard_date: string | null
  period_start: string
  period_end: string
  capital_base: number
  previous_capital_base: number
  return_rate: number
  base_return_eligible: boolean
  split_client: number
  split_manager: number
  client_deposit: number
  client_withdraw: number
  reinvest_profit: number
  client_profit_withdraw: number
  manager_share_withdraw: number
  capital_status: string
  status: SettlementStatus
  trading_profit: number
  base_return: number
  excess_profit: number
  client_profit: number
  manager_profit: number
  loss_amount: number
  loss_percent: number
  risk_status: RiskStatus
  next_capital_suggestion: number
  note: string | null
}

interface FinanceOverviewResponse {
  period: string
  updated_at: string
  profit_basis: string
  rule_note: string
  summary: FinanceSummary
  action_needed: string[]
  items: FinanceItem[]
}

interface CapitalBaseItem {
  id: number
  account_login: number
  account_label: string
  client_name: string | null
  period: string
  period_type: string
  onboard_date: string | null
  period_start: string
  period_end: string
  capital_base: number
  previous_capital_base: number
  return_rate: number
  base_return_eligible: number
  split_client: number
  split_manager: number
  client_deposit: number
  client_withdraw: number
  reinvest_profit: number
  client_profit_withdraw: number
  manager_share_withdraw: number
  note: string | null
  status: string
}

interface CapitalBaseResponse {
  period: string
  total: number
  items: CapitalBaseItem[]
}

interface CashFlowItem {
  id: number
  account_login: number
  account_label: string
  client_name: string | null
  flow_date: string
  period: string
  category: string
  amount: number
  raw_type: string | null
  raw_comment: string | null
  note: string | null
}

interface CashFlowResponse {
  period: string
  total: number
  items: CashFlowItem[]
}


interface FinanceAccountItem {
  account_login: number
  account_label: string
  last_snapshot_time?: string | null
}

interface FinanceAccountsResponse {
  total: number
  items: FinanceAccountItem[]
}

type CapitalForm = {
  accountKey: string
  client_name: string
  period_type: 'NORMAL' | 'ONBOARDING'
  onboard_date: string
  capital_base: string
  previous_capital_base: string
  client_deposit: string
  client_withdraw: string
  reinvest_profit: string
  client_profit_withdraw: string
  manager_share_withdraw: string
  note: string
}

function currentPeriod(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  return `${now.getFullYear()}-${month}`
}

function fmt(value: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function fmtSigned(value: number): string {
  return `${value >= 0 ? '+' : ''}${fmt(value)}`
}

function fmtPct(value: number): string {
  return `${(value * 100).toFixed(value * 100 % 1 === 0 ? 0 : 1)}%`
}

function statusClass(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'LOCKED':
      return 'bg-blue-50 text-blue-700 border-blue-200'
    case 'DRAFT':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'LIVE':
      return 'bg-slate-100 text-slate-700 border-slate-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function riskClass(status: RiskStatus): string {
  switch (status) {
    case 'NORMAL':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    case 'LOW_PROFIT':
      return 'bg-sky-50 text-sky-700 border-sky-200'
    case 'SPLIT_ONLY':
      return 'bg-violet-50 text-violet-700 border-violet-200'
    case 'LOSS':
      return 'bg-amber-50 text-amber-700 border-amber-200'
    case 'HIGH_LOSS':
      return 'bg-red-50 text-red-700 border-red-200'
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200'
  }
}

function moneyClass(value: number): string {
  if (value > 0) return 'text-emerald-700'
  if (value < 0) return 'text-red-700'
  return 'text-slate-700'
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  return response.json()
}


async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`HTTP ${response.status}${text ? ` · ${text.slice(0, 160)}` : ''}`)
  }
  return response.json()
}

function StatCard({
  title,
  value,
  sub,
  tone = 'default',
}: {
  title: string
  value: string
  sub?: string
  tone?: 'default' | 'green' | 'red' | 'yellow' | 'blue'
}) {
  const toneClass = {
    default: 'border-slate-200 bg-white',
    green: 'border-emerald-200 bg-emerald-50',
    red: 'border-red-200 bg-red-50',
    yellow: 'border-amber-200 bg-amber-50',
    blue: 'border-blue-200 bg-blue-50',
  }[tone]

  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-slate-900">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

function Badge({ children, className }: { children: ReactNode; className: string }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  )
}

export default function FinanceDashboardPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const [overview, setOverview] = useState<FinanceOverviewResponse | null>(null)
  const [capitalBase, setCapitalBase] = useState<CapitalBaseResponse | null>(null)
  const [cashFlows, setCashFlows] = useState<CashFlowResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [financeAccounts, setFinanceAccounts] = useState<FinanceAccountItem[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [capitalForm, setCapitalForm] = useState<CapitalForm>({
    accountKey: '',
    client_name: '',
    period_type: 'NORMAL',
    onboard_date: '',
    capital_base: '',
    previous_capital_base: '',
    client_deposit: '0',
    client_withdraw: '0',
    reinvest_profit: '0',
    client_profit_withdraw: '0',
    manager_share_withdraw: '0',
    note: '',
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const query = `api_key=${encodeURIComponent(API_KEY)}&period=${encodeURIComponent(period)}`
      const [overviewData, capitalData, cashData, accountData] = await Promise.all([
        fetchJson<FinanceOverviewResponse>(`${API_URL}/api/finance/overview?${query}`),
        fetchJson<CapitalBaseResponse>(`${API_URL}/api/finance/capital-base?${query}`),
        fetchJson<CashFlowResponse>(`${API_URL}/api/finance/cash-flows?${query}`),
        fetchJson<FinanceAccountsResponse>(`${API_URL}/api/finance/accounts?api_key=${encodeURIComponent(API_KEY)}`),
      ])
      setOverview(overviewData)
      setCapitalBase(capitalData)
      setCashFlows(cashData)
      setFinanceAccounts(accountData.items ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    loadData()
  }, [loadData])

  const summary = overview?.summary

  const actionTone = useMemo(() => {
    if (!summary) return 'default'
    if (summary.high_loss_accounts > 0) return 'red'
    if (summary.loss_accounts > 0 || summary.split_only_accounts > 0) return 'yellow'
    return 'green'
  }, [summary])

  const selectedAccount = useMemo(() => {
    const [login, ...labelParts] = capitalForm.accountKey.split('|')
    if (!login) return null
    return {
      account_login: Number(login),
      account_label: labelParts.join('|'),
    }
  }, [capitalForm.accountKey])

  const computedBaseReturnRule = useMemo(() => {
    if (capitalForm.period_type === 'NORMAL') return 'Eligible 3%'
    if (!capitalForm.onboard_date) return 'No 3% until onboard date is set'
    const day = Number(capitalForm.onboard_date.slice(-2))
    return day < 5 ? 'Onboard before day 5: Eligible 3%' : 'Onboard from day 5: No 3%, split 50/50 only'
  }, [capitalForm.period_type, capitalForm.onboard_date])

  function updateCapitalForm<K extends keyof CapitalForm>(key: K, value: CapitalForm[K]) {
    setCapitalForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSaveCapitalBase() {
    if (!selectedAccount) {
      setActionMessage('Hãy chọn account trước khi lưu Capital Base.')
      return
    }
    setActionLoading(true)
    setActionMessage(null)
    try {
      await postJson(`${API_URL}/api/finance/capital-base/upsert?api_key=${encodeURIComponent(API_KEY)}`, {
        account_login: selectedAccount.account_login,
        account_label: selectedAccount.account_label,
        client_name: capitalForm.client_name || null,
        period,
        period_type: capitalForm.period_type,
        onboard_date: capitalForm.period_type === 'ONBOARDING' ? capitalForm.onboard_date || null : null,
        capital_base: Number(capitalForm.capital_base || 0),
        previous_capital_base: Number(capitalForm.previous_capital_base || 0),
        return_rate: 0.03,
        split_client: 0.5,
        split_manager: 0.5,
        client_deposit: Number(capitalForm.client_deposit || 0),
        client_withdraw: Number(capitalForm.client_withdraw || 0),
        reinvest_profit: Number(capitalForm.reinvest_profit || 0),
        client_profit_withdraw: Number(capitalForm.client_profit_withdraw || 0),
        manager_share_withdraw: Number(capitalForm.manager_share_withdraw || 0),
        note: capitalForm.note,
        status: 'CONFIRMED',
      })
      setActionMessage('Đã lưu Capital Base. Dashboard đang refresh lại data.')
      await loadData()
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleGenerateSettlements() {
    setActionLoading(true)
    setActionMessage(null)
    try {
      const result = await postJson<{ generated: number; skipped_locked: number }>(
        `${API_URL}/api/finance/settlements/generate?api_key=${encodeURIComponent(API_KEY)}&period=${encodeURIComponent(period)}`,
        {}
      )
      setActionMessage(`Generated ${result.generated} settlement(s). Skipped locked: ${result.skipped_locked}.`)
      await loadData()
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Generate failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleLockSettlement(item: FinanceItem) {
    setActionLoading(true)
    setActionMessage(null)
    try {
      await postJson(`${API_URL}/api/finance/settlements/lock?api_key=${encodeURIComponent(API_KEY)}`, {
        account_login: item.account_login,
        period: item.period,
      })
      setActionMessage(`Đã lock settlement cho ${item.account_label}.`)
      await loadData()
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Lock failed')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleMarkPaid(item: FinanceItem) {
    setActionLoading(true)
    setActionMessage(null)
    try {
      await postJson(`${API_URL}/api/finance/settlements/mark-paid?api_key=${encodeURIComponent(API_KEY)}`, {
        account_login: item.account_login,
        period: item.period,
      })
      setActionMessage(`Đã mark PAID cho ${item.account_label}.`)
      await loadData()
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : 'Mark paid failed')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 md:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <a href="/dashboard" className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50">
                ← Trading Dashboard
              </a>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                Finance Dashboard
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">Finance Dashboard</h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-400">
              Quản lý Capital Base, lợi nhuận tháng, mức 3%, phần chia khách và phần manager. Module này tách riêng khỏi Trading Dashboard.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="text-xs uppercase tracking-wide text-slate-500">Period</label>
            <input
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <button
              onClick={loadData}
              disabled={loading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </header>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Không tải được Finance Dashboard: {error}. Kiểm tra API đã cập nhật file mới và chạy migration finance chưa.
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <StatCard title="Total Capital Base" value={fmt(summary?.total_capital_base ?? 0)} sub={`${summary?.account_count ?? 0} account(s)`} tone="blue" />
          <StatCard title="Trading Profit" value={fmtSigned(summary?.total_trading_profit ?? 0)} sub="Realized net profit" tone={(summary?.total_trading_profit ?? 0) < 0 ? 'red' : 'green'} />
          <StatCard title="3% Base Return" value={fmt(summary?.total_base_return ?? 0)} sub="Eligible accounts only" />
          <StatCard title="Client Profit" value={fmtSigned(summary?.total_client_profit ?? 0)} sub="Payable / settlement" tone={(summary?.total_client_profit ?? 0) < 0 ? 'red' : 'green'} />
          <StatCard title="Manager Profit" value={fmt(summary?.total_manager_profit ?? 0)} sub="Your share" tone="green" />
          <StatCard title="Risk" value={`${summary?.loss_accounts ?? 0} loss`} sub={`${summary?.high_loss_accounts ?? 0} high loss`} tone={actionTone} />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Finance Admin</h2>
              <p className="mt-1 text-sm text-slate-500">Nhập/sửa Capital Base trực tiếp trên dashboard, sau đó generate settlement cho kỳ đang chọn.</p>
            </div>
            <button
              onClick={handleGenerateSettlements}
              disabled={actionLoading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Generate Settlements
            </button>
          </div>

          {actionMessage && (
            <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
              {actionMessage}
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Account</span>
              <select
                value={capitalForm.accountKey}
                onChange={(e) => updateCapitalForm('accountKey', e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">Select account</option>
                {financeAccounts.map((account) => (
                  <option key={`${account.account_login}-${account.account_label}`} value={`${account.account_login}|${account.account_label}`}>
                    {account.account_label} · {account.account_login}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Client Name</span>
              <input
                value={capitalForm.client_name}
                onChange={(e) => updateCapitalForm('client_name', e.target.value)}
                placeholder="Tên khách"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Period Type</span>
              <select
                value={capitalForm.period_type}
                onChange={(e) => updateCapitalForm('period_type', e.target.value as CapitalForm['period_type'])}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="NORMAL">NORMAL</option>
                <option value="ONBOARDING">ONBOARDING</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Onboard Date</span>
              <input
                type="date"
                value={capitalForm.onboard_date}
                disabled={capitalForm.period_type !== 'ONBOARDING'}
                onChange={(e) => updateCapitalForm('onboard_date', e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 disabled:bg-slate-100 disabled:text-slate-400"
              />
              <div className="text-xs text-slate-400">{computedBaseReturnRule}</div>
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Capital Base</span>
              <input
                type="number"
                value={capitalForm.capital_base}
                onChange={(e) => updateCapitalForm('capital_base', e.target.value)}
                placeholder="10000"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Previous Capital</span>
              <input
                type="number"
                value={capitalForm.previous_capital_base}
                onChange={(e) => updateCapitalForm('previous_capital_base', e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Deposit</span>
              <input type="number" value={capitalForm.client_deposit} onChange={(e) => updateCapitalForm('client_deposit', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Withdraw</span>
              <input type="number" value={capitalForm.client_withdraw} onChange={(e) => updateCapitalForm('client_withdraw', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Reinvest Profit</span>
              <input type="number" value={capitalForm.reinvest_profit} onChange={(e) => updateCapitalForm('reinvest_profit', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Profit Withdraw</span>
              <input type="number" value={capitalForm.client_profit_withdraw} onChange={(e) => updateCapitalForm('client_profit_withdraw', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>

            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Manager Withdraw</span>
              <input type="number" value={capitalForm.manager_share_withdraw} onChange={(e) => updateCapitalForm('manager_share_withdraw', e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
            </label>

            <label className="space-y-1 text-sm xl:col-span-2">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Note</span>
              <input
                value={capitalForm.note}
                onChange={(e) => updateCapitalForm('note', e.target.value)}
                placeholder="Ghi chú chốt vốn với khách"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              onClick={handleSaveCapitalBase}
              disabled={actionLoading}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save Capital Base
            </button>
            <div className="text-xs text-slate-500">
              Save chỉ lưu Capital Base. Bấm Generate Settlements để ghi lại settlement DRAFT cho kỳ này.
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900">Current Settlement Preview</h2>
              <div className="text-xs text-slate-400">Updated: {overview?.updated_at ?? '-'}</div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] border-separate border-spacing-0 text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="border-b border-slate-200 px-3 py-3">Account</th>
                    <th className="border-b border-slate-200 px-3 py-3">Type</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right">Capital</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right">Profit</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right">3% Base</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right">Excess</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right">Client</th>
                    <th className="border-b border-slate-200 px-3 py-3 text-right">Manager</th>
                    <th className="border-b border-slate-200 px-3 py-3">Risk</th>
                    <th className="border-b border-slate-200 px-3 py-3">Status</th>
                    <th className="border-b border-slate-200 px-3 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.items ?? []).map((item) => (
                    <tr key={`${item.account_login}-${item.period}`} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="border-b border-slate-100 px-3 py-3">
                        <div className="font-medium text-slate-900">{item.account_label}</div>
                        <div className="text-xs text-slate-400">{item.client_name || `Login ${item.account_login}`}</div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <div className="font-medium text-slate-800">{item.period_type}</div>
                        <div className="text-xs text-slate-500">
                          {item.period_start} → {item.period_end}
                        </div>
                        {item.onboard_date && <div className="text-xs text-violet-700">Onboard: {item.onboard_date}</div>}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right text-slate-900">{fmt(item.capital_base)}</td>
                      <td className={`border-b border-slate-100 px-3 py-3 text-right font-semibold ${moneyClass(item.trading_profit)}`}>{fmtSigned(item.trading_profit)}</td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right">
                        <div className="text-slate-900">{fmt(item.base_return)}</div>
                        <div className="text-xs text-slate-500">{item.base_return_eligible ? 'Eligible' : 'No 3%'}</div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right text-slate-700">{fmt(item.excess_profit)}</td>
                      <td className={`border-b border-slate-100 px-3 py-3 text-right font-semibold ${moneyClass(item.client_profit)}`}>{fmtSigned(item.client_profit)}</td>
                      <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold text-emerald-700">{fmt(item.manager_profit)}</td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <Badge className={riskClass(item.risk_status)}>{item.risk_status}</Badge>
                        {item.loss_percent > 0 && <div className="mt-1 text-xs text-red-700">-{item.loss_percent.toFixed(2)}%</div>}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <Badge className={statusClass(item.status)}>{item.status}</Badge>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <div className="flex flex-col gap-2">
                          {item.status !== 'LOCKED' && item.status !== 'PAID' && (
                            <button
                              onClick={() => handleLockSettlement(item)}
                              disabled={actionLoading}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-60"
                            >
                              Lock
                            </button>
                          )}
                          {item.status !== 'PAID' && (
                            <button
                              onClick={() => handleMarkPaid(item)}
                              disabled={actionLoading}
                              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                            >
                              Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(overview?.items ?? []).length === 0 && (
              <div className="py-8 text-center text-sm text-slate-400">
                Chưa có Capital Base cho kỳ {period}. Hãy nhập bằng file CSV rồi import trên VPS.
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Action Needed</h2>
              <div className="mt-3 space-y-2">
                {(overview?.action_needed ?? []).length > 0 ? (
                  overview?.action_needed.map((item, idx) => (
                    <div key={idx} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                      {item}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    Không có cảnh báo chính cho kỳ này.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Finance Rules</h2>
              <div className="mt-3 space-y-2 text-sm text-slate-700">
                <p>Capital Base nhập tay theo từng tháng.</p>
                <p>Khách onboard trước ngày 5: có mức 3%.</p>
                <p>Khách onboard từ ngày 5: không có 3%, lời chia 50/50.</p>
                <p>Tháng âm: manager nhận 0, account chuyển risk LOSS/HIGH_LOSS.</p>
              </div>
            </div>
          </aside>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Capital Base Management</h2>
            <div className="text-xs text-slate-400">Manual input source</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 px-3 py-3">Account</th>
                  <th className="border-b border-slate-200 px-3 py-3">Period</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Previous</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Deposit</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Withdraw</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Reinvest</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Profit Withdraw</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Capital Base</th>
                  <th className="border-b border-slate-200 px-3 py-3">3%</th>
                  <th className="border-b border-slate-200 px-3 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {(capitalBase?.items ?? []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-3">
                      <div className="font-medium text-slate-900">{item.account_label}</div>
                      <div className="text-xs text-slate-400">{item.client_name || `Login ${item.account_login}`}</div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <div>{item.period}</div>
                      <div className="text-xs text-slate-500">{item.period_type}</div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right">{fmt(item.previous_capital_base)}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-emerald-700">{fmt(item.client_deposit)}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-red-700">{fmt(item.client_withdraw)}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-blue-700">{fmt(item.reinvest_profit)}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right text-amber-700">{fmt(item.client_profit_withdraw)}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-right font-semibold text-slate-900">{fmt(item.capital_base)}</td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <Badge className={item.base_return_eligible ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-violet-200 bg-violet-50 text-violet-700'}>
                        {item.base_return_eligible ? `${fmtPct(item.return_rate)}` : 'No 3%'}
                      </Badge>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <Badge className={statusClass(item.status)}>{item.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-900">Cash Flow Ledger</h2>
            <div className="text-xs text-slate-400">{cashFlows?.total ?? 0} item(s)</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 px-3 py-3">Date</th>
                  <th className="border-b border-slate-200 px-3 py-3">Account</th>
                  <th className="border-b border-slate-200 px-3 py-3">Category</th>
                  <th className="border-b border-slate-200 px-3 py-3 text-right">Amount</th>
                  <th className="border-b border-slate-200 px-3 py-3">Note</th>
                </tr>
              </thead>
              <tbody>
                {(cashFlows?.items ?? []).map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{item.flow_date}</td>
                    <td className="border-b border-slate-100 px-3 py-3">
                      <div className="font-medium text-slate-900">{item.account_label}</div>
                      <div className="text-xs text-slate-400">{item.client_name || `Login ${item.account_login}`}</div>
                    </td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-700">{item.category}</td>
                    <td className={`border-b border-slate-100 px-3 py-3 text-right font-semibold ${moneyClass(item.amount)}`}>{fmtSigned(item.amount)}</td>
                    <td className="border-b border-slate-100 px-3 py-3 text-slate-400">{item.note || item.raw_comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(cashFlows?.items ?? []).length === 0 && (
            <div className="py-6 text-center text-sm text-slate-400">Chưa có cash flow finance cho kỳ này.</div>
          )}
        </section>

        <footer className="pb-4 text-center text-xs text-slate-500">
          Finance Dashboard · Profit basis: realized net_profit · Capital Base nhập tay theo từng tháng
        </footer>
      </div>
    </main>
  )
}
