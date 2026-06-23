"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

const API_URL = "https://api.damquangloc.com";
const API_KEY = "mt5dashboard2026";

type RiskStatus = "NORMAL" | "LOW_PROFIT" | "LOSS" | "HIGH_LOSS" | "SPLIT_ONLY";
type SettlementStatus = "LIVE" | "DRAFT" | "LOCKED" | "PAID";

type ClientAccount = {
  account_login: number;
  account_label: string;
  last_snapshot_time?: string | null;
  client_name?: string | null;
  start_trade_date?: string | null;
  client_status?: string | null;
  client_note?: string | null;
};

type WorkspaceClient = {
  id: number;
  account_login: number;
  account_label: string;
  client_name: string;
  start_trade_date: string;
  status: string;
  note: string | null;
};

type WorkspaceItem = {
  account_login: number;
  account_label: string;
  client_name: string | null;
  period: string;
  period_type: string;
  onboard_date: string | null;
  period_start: string;
  period_end: string;
  capital_base: number;
  base_return_eligible: boolean;
  capital_status: string;
  note: string | null;
  status: SettlementStatus;
  trading_profit: number;
  base_return: number;
  excess_profit: number;
  client_profit: number;
  manager_profit: number;
  loss_amount: number;
  loss_percent: number;
  risk_status: RiskStatus;
  has_capital_input: boolean;
  locked_at?: string | null;
  paid_at?: string | null;
};

type WorkspaceResponse = {
  ok: boolean;
  has_profile: boolean;
  account_login?: number;
  account_label?: string;
  client: WorkspaceClient | null;
  through_period: string;
  items: WorkspaceItem[];
  summary: {
    months: number;
    capital_base_total_current: number;
    trading_profit_total: number;
    client_profit_total: number;
    manager_profit_total: number;
    missing_capital_months: number;
    loss_months: number;
  };
  message?: string;
};

type MonthlyOverviewResponse = {
  ok: boolean;
  period: string;
  period_start: string;
  period_end: string;
  updated_at: string;
  profit_basis: string;
  summary: {
    client_count: number;
    completed_capital_count: number;
    missing_capital_count: number;
    zero_capital_count: number;
    total_capital_base: number;
    total_trading_profit: number;
    total_base_return: number;
    total_client_profit: number;
    total_manager_profit: number;
    total_loss_amount: number;
    loss_accounts: number;
    high_loss_accounts: number;
    split_only_accounts: number;
    settlement_status: {
      live: number;
      draft: number;
      locked: number;
      paid: number;
    };
  };
  action_needed: string[];
  items: WorkspaceItem[];
};

function currentPeriod(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}`;
}

function currentDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

function fmt(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

function fmtSigned(value: number): string {
  return `${value >= 0 ? "+" : ""}${fmt(value)}`;
}

function moneyClass(value: number): string {
  if (value > 0) return "text-emerald-700";
  if (value < 0) return "text-red-700";
  return "text-slate-700";
}

function statusClass(status: string): string {
  switch (status) {
    case "PAID":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "LOCKED":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "DRAFT":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "LIVE":
      return "bg-slate-100 text-slate-700 border-slate-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function riskClass(status: RiskStatus): string {
  switch (status) {
    case "NORMAL":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "LOW_PROFIT":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "SPLIT_ONLY":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "LOSS":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "HIGH_LOSS":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

function Badge({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function StatCard({
  title,
  value,
  sub,
  tone = "default",
}: {
  title: string;
  value: string;
  sub?: string;
  tone?: "default" | "green" | "red" | "blue" | "yellow";
}) {
  const toneClass = {
    default: "border-slate-200 bg-white",
    green: "border-emerald-200 bg-emerald-50",
    red: "border-red-200 bg-red-50",
    blue: "border-blue-200 bg-blue-50",
    yellow: "border-amber-200 bg-amber-50",
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${toneClass}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-2xl font-bold text-slate-950">{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

async function apiGet<T>(path: string): Promise<T> {
  const joiner = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_URL}${path}${joiner}api_key=${API_KEY}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function apiPost<T>(
  path: string,
  payload?: Record<string, unknown>,
): Promise<T> {
  const joiner = path.includes("?") ? "&" : "?";
  const res = await fetch(`${API_URL}${path}${joiner}api_key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export default function FinanceDashboardPage() {
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [selectedLogin, setSelectedLogin] = useState<number | null>(null);
  const [throughPeriod, setThroughPeriod] = useState(currentPeriod());
  const [overviewPeriod, setOverviewPeriod] = useState(currentPeriod());
  const [monthlyOverview, setMonthlyOverview] =
    useState<MonthlyOverviewResponse | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceResponse | null>(null);
  const [capitalInputs, setCapitalInputs] = useState<Record<string, string>>(
    {},
  );
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});
  const [profileName, setProfileName] = useState("");
  const [startTradeDate, setStartTradeDate] = useState("");
  const [profileNote, setProfileNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [error, setError] = useState<string>("");

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.account_login === selectedLogin) || null,
    [accounts, selectedLogin],
  );

  const loadAccounts = useCallback(async () => {
    const data = await apiGet<{ total: number; items: ClientAccount[] }>(
      "/api/finance/client-workspace/accounts",
    );
    setAccounts(data.items);
    setSelectedLogin((prev) => prev ?? data.items[0]?.account_login ?? null);
  }, []);

  const loadWorkspace = useCallback(
    async (login: number | null = selectedLogin) => {
      if (!login) return;
      const data = await apiGet<WorkspaceResponse>(
        `/api/finance/client-workspace?account_login=${login}&through_period=${throughPeriod}`,
      );
      setWorkspace(data);

      const account = accounts.find((a) => a.account_login === login);
      const client = data.client;
      setProfileName(
        client?.client_name ||
          account?.client_name ||
          account?.account_label ||
          "",
      );
      setStartTradeDate(
        client?.start_trade_date || account?.start_trade_date || "",
      );
      setProfileNote(client?.note || account?.client_note || "");

      const caps: Record<string, string> = {};
      const notes: Record<string, string> = {};
      data.items.forEach((item) => {
        caps[item.period] = item.has_capital_input
          ? String(item.capital_base)
          : "";
        notes[item.period] = item.note || "";
      });
      setCapitalInputs(caps);
      setNoteInputs(notes);
    },
    [accounts, selectedLogin, throughPeriod],
  );

  const loadMonthlyOverview = useCallback(async () => {
    const data = await apiGet<MonthlyOverviewResponse>(
      `/api/finance/client-workspace/monthly-overview?period=${overviewPeriod}`,
    );
    setMonthlyOverview(data);
  }, [overviewPeriod]);

  useEffect(() => {
    setLoading(true);
    loadAccounts()
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [loadAccounts]);

  useEffect(() => {
    if (!selectedLogin) return;
    setMessage("");
    setError("");
    loadWorkspace(selectedLogin).catch((e) => setError(String(e)));
  }, [selectedLogin, throughPeriod, loadWorkspace]);

  useEffect(() => {
    loadMonthlyOverview().catch((e) => setError(String(e)));
  }, [loadMonthlyOverview]);

  async function refreshAll(login = selectedLogin) {
    await loadAccounts();
    await loadWorkspace(login);
    await loadMonthlyOverview();
  }

  async function saveProfile() {
    if (!selectedAccount || !selectedLogin) return;
    setSaving("profile");
    setError("");
    try {
      await apiPost("/api/finance/clients/upsert", {
        account_login: selectedLogin,
        account_label: selectedAccount.account_label,
        client_name: profileName || selectedAccount.account_label,
        start_trade_date: startTradeDate,
        note: profileNote,
        status: "ACTIVE",
      });
      setMessage("Đã lưu hồ sơ khách hàng và tạo workspace theo tháng.");
      await refreshAll(selectedLogin);
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(null);
    }
  }

  async function saveMonth(item: WorkspaceItem) {
    setSaving(`save-${item.period}`);
    setError("");
    try {
      await apiPost("/api/finance/client-month/upsert", {
        account_login: item.account_login,
        period: item.period,
        capital_base: capitalInputs[item.period] || 0,
        note: noteInputs[item.period] || "",
      });
      setMessage(`Đã lưu Capital Base tháng ${item.period}.`);
      await loadWorkspace(item.account_login);
      await loadMonthlyOverview();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(null);
    }
  }

  async function generateMonth(item: WorkspaceItem) {
    setSaving(`generate-${item.period}`);
    setError("");
    try {
      await apiPost("/api/finance/client-month/generate", {
        account_login: item.account_login,
        period: item.period,
      });
      setMessage(`Đã generate settlement tháng ${item.period}.`);
      await loadWorkspace(item.account_login);
      await loadMonthlyOverview();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(null);
    }
  }

  async function updateStatus(
    item: WorkspaceItem,
    action: "LOCKED" | "PAID" | "DRAFT",
  ) {
    setSaving(`${action}-${item.period}`);
    setError("");
    try {
      if (action === "LOCKED") {
        await apiPost("/api/finance/settlements/lock", {
          account_login: item.account_login,
          period: item.period,
        });
      } else if (action === "PAID") {
        await apiPost("/api/finance/settlements/mark-paid", {
          account_login: item.account_login,
          period: item.period,
        });
      } else {
        await apiPost("/api/finance/settlements/reset-status", {
          account_login: item.account_login,
          period: item.period,
          target_status: "DRAFT",
        });
      }
      setMessage(`Đã cập nhật status ${item.period} về ${action}.`);
      await loadWorkspace(item.account_login);
      await loadMonthlyOverview();
    } catch (e) {
      setError(String(e));
    } finally {
      setSaving(null);
    }
  }

  const summary = workspace?.summary;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-[1500px] px-5 py-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Finance Dashboard Ver 5
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Client Finance Workspace + Monthly Overview
            </h1>
            <p className="mt-1 max-w-3xl text-sm text-slate-600">
              Chọn từng khách để nhập Capital Base theo tháng, đồng thời xem
              bảng tổng quan toàn bộ khách theo từng kỳ.
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-slate-500">
                Through period
              </span>
              <input
                value={throughPeriod}
                onChange={(e) => setThroughPeriod(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500"
                placeholder="2026-06"
              />
            </label>
            <button
              onClick={() => loadWorkspace()}
              className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Refresh
            </button>
          </div>
        </header>

        {error ? (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {message ? (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {message}
          </div>
        ) : null}

        <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                Monthly Overview
              </div>
              <h2 className="mt-1 text-xl font-bold text-slate-950">
                Tổng quan Finance theo tháng
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Sau khi nhập Capital Base từng khách, dùng bảng này để kiểm tra
                tổng vốn, PNL, phần khách, phần manager và các dòng còn thiếu
                theo kỳ.
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Overview period
                </span>
                <input
                  value={overviewPeriod}
                  onChange={(e) => setOverviewPeriod(e.target.value)}
                  className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold outline-none focus:border-blue-500"
                  placeholder="2026-06"
                />
              </label>
              <button
                onClick={loadMonthlyOverview}
                className="h-10 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Refresh Overview
              </button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-5">
            <StatCard
              title="Total Capital"
              value={fmt(monthlyOverview?.summary.total_capital_base || 0)}
              sub={`${monthlyOverview?.summary.completed_capital_count || 0}/${monthlyOverview?.summary.client_count || 0} clients input`}
              tone="blue"
            />
            <StatCard
              title="Trading PNL"
              value={fmtSigned(
                monthlyOverview?.summary.total_trading_profit || 0,
              )}
              sub="Realized net profit"
              tone={
                (monthlyOverview?.summary.total_trading_profit || 0) >= 0
                  ? "green"
                  : "red"
              }
            />
            <StatCard
              title="Client Profit"
              value={fmtSigned(
                monthlyOverview?.summary.total_client_profit || 0,
              )}
              sub="Tổng phần khách"
            />
            <StatCard
              title="Manager Profit"
              value={fmt(monthlyOverview?.summary.total_manager_profit || 0)}
              sub="Tổng phần của bạn"
              tone="green"
            />
            <StatCard
              title="Need Check"
              value={`${monthlyOverview?.summary.missing_capital_count || 0}`}
              sub={`Loss: ${monthlyOverview?.summary.loss_accounts || 0} · Zero: ${monthlyOverview?.summary.zero_capital_count || 0}`}
              tone={
                (monthlyOverview?.summary.missing_capital_count || 0) > 0
                  ? "yellow"
                  : "default"
              }
            />
          </div>

          {monthlyOverview?.action_needed?.length ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <div className="font-bold">Action needed</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {monthlyOverview.action_needed.map((item) => (
                  <Badge
                    key={item}
                    className="border-amber-200 bg-white text-amber-700"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-[1120px] w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="border-b border-slate-200 py-3 pr-3">
                    Client / Account
                  </th>
                  <th className="border-b border-slate-200 px-3">Type</th>
                  <th className="border-b border-slate-200 px-3">
                    Capital Base
                  </th>
                  <th className="border-b border-slate-200 px-3">3%</th>
                  <th className="border-b border-slate-200 px-3">
                    Trading PNL
                  </th>
                  <th className="border-b border-slate-200 px-3">3% Base</th>
                  <th className="border-b border-slate-200 px-3">
                    Client Profit
                  </th>
                  <th className="border-b border-slate-200 px-3">
                    Manager Profit
                  </th>
                  <th className="border-b border-slate-200 px-3">Risk</th>
                  <th className="border-b border-slate-200 px-3">Status</th>
                  <th className="border-b border-slate-200 py-3 pl-3">Input</th>
                </tr>
              </thead>
              <tbody>
                {monthlyOverview?.items?.length ? (
                  monthlyOverview.items.map((item) => (
                    <tr key={`overview-${item.account_login}-${item.period}`}>
                      <td className="border-b border-slate-100 py-3 pr-3">
                        <div className="font-bold text-slate-950">
                          {item.client_name || item.account_label}
                        </div>
                        <div className="text-xs text-slate-500">
                          {item.account_label} · {item.account_login}
                        </div>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <Badge
                          className={
                            item.period_type === "ONBOARDING"
                              ? "border-violet-200 bg-violet-50 text-violet-700"
                              : "border-slate-200 bg-slate-50 text-slate-700"
                          }
                        >
                          {item.period_type}
                        </Badge>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 font-bold text-slate-950">
                        {fmt(item.capital_base)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        {item.base_return_eligible ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            Yes
                          </Badge>
                        ) : (
                          <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                            No / 50:50
                          </Badge>
                        )}
                      </td>
                      <td
                        className={`border-b border-slate-100 px-3 py-3 font-bold ${moneyClass(item.trading_profit)}`}
                      >
                        {fmtSigned(item.trading_profit)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-700">
                        {fmt(item.base_return)}
                      </td>
                      <td
                        className={`border-b border-slate-100 px-3 py-3 font-bold ${moneyClass(item.client_profit)}`}
                      >
                        {fmtSigned(item.client_profit)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3 font-bold text-emerald-700">
                        {fmt(item.manager_profit)}
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <Badge className={riskClass(item.risk_status)}>
                          {item.risk_status}
                        </Badge>
                      </td>
                      <td className="border-b border-slate-100 px-3 py-3">
                        <Badge className={statusClass(item.status)}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="border-b border-slate-100 py-3 pl-3">
                        {item.has_capital_input ? (
                          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            Done
                          </Badge>
                        ) : (
                          <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                            Missing
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={11}
                      className="py-6 text-center text-sm text-slate-500"
                    >
                      Chưa có client profile nào cho kỳ này. Hãy chọn khách và
                      lưu Start Trade Date trước.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
          <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-950">
                Clients / Accounts
              </h2>
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                {accounts.length}
              </Badge>
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="text-sm text-slate-500">Loading...</div>
              ) : null}
              {accounts.map((account) => {
                const active = account.account_login === selectedLogin;
                return (
                  <button
                    key={`${account.account_login}-${account.account_label}`}
                    onClick={() => setSelectedLogin(account.account_login)}
                    className={`w-full rounded-2xl border p-3 text-left transition ${active ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white hover:bg-slate-50"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-bold text-slate-950">
                        {account.account_label}
                      </div>
                      {account.start_trade_date ? (
                        <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                          Profile
                        </Badge>
                      ) : (
                        <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                          New
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {account.client_name || "Chưa đặt tên khách"}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-400">
                      Login: {account.account_login}
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <section className="space-y-5">
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="Current Capital"
                value={fmt(summary?.capital_base_total_current || 0)}
                sub="Capital base gần nhất đã nhập"
                tone="blue"
              />
              <StatCard
                title="Total Trading PNL"
                value={fmtSigned(summary?.trading_profit_total || 0)}
                sub="Realized net profit"
                tone={
                  (summary?.trading_profit_total || 0) >= 0 ? "green" : "red"
                }
              />
              <StatCard
                title="Client Profit"
                value={fmtSigned(summary?.client_profit_total || 0)}
                sub="Tổng phần khách"
              />
              <StatCard
                title="Manager Profit"
                value={fmt(summary?.manager_profit_total || 0)}
                sub="Tổng phần của bạn"
                tone="green"
              />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-1">
                <h2 className="text-lg font-bold text-slate-950">
                  1. Client Profile
                </h2>
                <p className="text-sm text-slate-500">
                  Nhập ngày bắt đầu trade một lần. Dashboard sẽ tự sổ các tháng
                  từ tháng bắt đầu đến kỳ bạn chọn.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
                    Account
                  </span>
                  <input
                    value={selectedAccount?.account_label || ""}
                    disabled
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
                    Client name
                  </span>
                  <input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
                    Start trade date
                  </span>
                  <input
                    type="date"
                    value={startTradeDate}
                    onChange={(e) => setStartTradeDate(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">
                    Profile note
                  </span>
                  <input
                    value={profileNote}
                    onChange={(e) => setProfileNote(e.target.value)}
                    placeholder="VD: khách từ tháng 5"
                    className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500"
                  />
                </label>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  onClick={saveProfile}
                  disabled={
                    !selectedLogin || !startTradeDate || saving === "profile"
                  }
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-40"
                >
                  {saving === "profile" ? "Saving..." : "Save Client Profile"}
                </button>
                {workspace?.has_profile ? (
                  <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                    Workspace active
                  </Badge>
                ) : (
                  <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                    Need start date
                  </Badge>
                )}
                <div className="text-xs text-slate-500">
                  Rule: start trước ngày 5 có 3%; từ ngày 5 trở đi không có 3%,
                  chỉ split 50/50 tháng đầu.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">
                    2. Monthly Capital Input
                  </h2>
                  <p className="text-sm text-slate-500">
                    Điền Capital Base từng tháng cho khách đang chọn. Các số
                    chia lợi nhuận tự tính ở cùng hàng.
                  </p>
                </div>
                {summary ? (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                      Months: {summary.months}
                    </Badge>
                    <Badge className="border-amber-200 bg-amber-50 text-amber-700">
                      Missing capital: {summary.missing_capital_months}
                    </Badge>
                    <Badge className="border-red-200 bg-red-50 text-red-700">
                      Loss months: {summary.loss_months}
                    </Badge>
                  </div>
                ) : null}
              </div>

              {!workspace?.has_profile ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                  Hãy lưu Client Profile trước, sau đó bảng tháng sẽ tự hiện ra.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="border-b border-slate-200 py-3 pr-3">
                          Month
                        </th>
                        <th className="border-b border-slate-200 px-3">Type</th>
                        <th className="border-b border-slate-200 px-3">
                          Capital Base
                        </th>
                        <th className="border-b border-slate-200 px-3">3%</th>
                        <th className="border-b border-slate-200 px-3">
                          Trading PNL
                        </th>
                        <th className="border-b border-slate-200 px-3">
                          3% Base
                        </th>
                        <th className="border-b border-slate-200 px-3">
                          Client
                        </th>
                        <th className="border-b border-slate-200 px-3">
                          Manager
                        </th>
                        <th className="border-b border-slate-200 px-3">Risk</th>
                        <th className="border-b border-slate-200 px-3">
                          Status
                        </th>
                        <th className="border-b border-slate-200 px-3">Note</th>
                        <th className="border-b border-slate-200 py-3 pl-3">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {workspace.items.map((item) => (
                        <tr key={item.period} className="align-top">
                          <td className="border-b border-slate-100 py-3 pr-3">
                            <div className="font-bold text-slate-950">
                              {item.period}
                            </div>
                            <div className="text-xs text-slate-500">
                              {item.period_start} → {item.period_end}
                            </div>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3">
                            <Badge
                              className={
                                item.period_type === "ONBOARDING"
                                  ? "border-violet-200 bg-violet-50 text-violet-700"
                                  : "border-slate-200 bg-slate-50 text-slate-700"
                              }
                            >
                              {item.period_type}
                            </Badge>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3">
                            <input
                              value={capitalInputs[item.period] ?? ""}
                              onChange={(e) =>
                                setCapitalInputs((prev) => ({
                                  ...prev,
                                  [item.period]: e.target.value,
                                }))
                              }
                              placeholder="0"
                              className="h-10 w-32 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-blue-500"
                            />
                            {!item.has_capital_input ? (
                              <div className="mt-1 text-[11px] font-semibold text-amber-600">
                                Missing
                              </div>
                            ) : null}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3">
                            {item.base_return_eligible ? (
                              <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                Yes
                              </Badge>
                            ) : (
                              <Badge className="border-violet-200 bg-violet-50 text-violet-700">
                                No / 50:50
                              </Badge>
                            )}
                          </td>
                          <td
                            className={`border-b border-slate-100 px-3 py-3 font-bold ${moneyClass(item.trading_profit)}`}
                          >
                            {fmtSigned(item.trading_profit)}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3 font-semibold text-slate-700">
                            {fmt(item.base_return)}
                          </td>
                          <td
                            className={`border-b border-slate-100 px-3 py-3 font-bold ${moneyClass(item.client_profit)}`}
                          >
                            {fmtSigned(item.client_profit)}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3 font-bold text-emerald-700">
                            {fmt(item.manager_profit)}
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3">
                            <Badge className={riskClass(item.risk_status)}>
                              {item.risk_status}
                            </Badge>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3">
                            <Badge className={statusClass(item.status)}>
                              {item.status}
                            </Badge>
                          </td>
                          <td className="border-b border-slate-100 px-3 py-3">
                            <input
                              value={noteInputs[item.period] ?? ""}
                              onChange={(e) =>
                                setNoteInputs((prev) => ({
                                  ...prev,
                                  [item.period]: e.target.value,
                                }))
                              }
                              placeholder="VD: compound / withdraw / loss review"
                              className="h-10 w-56 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="border-b border-slate-100 py-3 pl-3">
                            <div className="flex min-w-[260px] flex-wrap gap-2">
                              <button
                                onClick={() => saveMonth(item)}
                                disabled={saving === `save-${item.period}`}
                                className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => generateMonth(item)}
                                disabled={
                                  !item.has_capital_input ||
                                  saving === `generate-${item.period}`
                                }
                                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                              >
                                Generate
                              </button>
                              <button
                                onClick={() => updateStatus(item, "LOCKED")}
                                disabled={
                                  item.status === "LOCKED" ||
                                  item.status === "PAID"
                                }
                                className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 disabled:opacity-40"
                              >
                                Lock
                              </button>
                              <button
                                onClick={() => updateStatus(item, "PAID")}
                                disabled={item.status === "PAID"}
                                className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40"
                              >
                                Paid
                              </button>
                              <button
                                onClick={() => updateStatus(item, "DRAFT")}
                                className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
                              >
                                Back Draft
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-bold text-slate-950">
                3. How to use
              </h2>
              <div className="mt-3 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <b>Step 1:</b> Chọn khách và lưu ngày bắt đầu trade.
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <b>Step 2:</b> Điền Capital Base từng tháng, kèm note nếu có
                  compound/rút/lỗ.
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <b>Step 3:</b> Generate settlement, review với khách rồi
                  Lock/Paid.
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
