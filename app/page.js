"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ComposedChart,
  Line,
} from "recharts";
import { useBudgets } from "./components/BudgetContext";
import { useTransactions } from "./components/TransactionContext";
import {
  EmptyAccounts,
  EmptyTransactions,
  DashboardHeader,
  DashboardLoading,
  ErrorBanner,
} from "./components/dashboard/DashboardStates";
import {
  filterTransactions,
  getBudgetSpent,
  getCashFlowData,
  getCashFlowTotals,
  getCategoryBreakdown,
  getProgressColor,
  getTotalBalance,
  groupAccountsByInstitution,
  mergeTransactions,
  sentenceCase,
  validateBudgetInput,
} from "@/lib/dashboard";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [linkToken, setLinkToken] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const { transactions, setTransactions } = useTransactions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Tab state — initialized from URL ?tab= param
  const initialTab = searchParams.get("tab") || "overview";
  const activeTab = ["overview", "cashflow", "budget"].includes(initialTab)
    ? initialTab
    : "overview";

  // Budget state
  const { budgets, createBudget, deleteBudget } = useBudgets();
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [budgetName, setBudgetName] = useState("");
  const [budgetLimit, setBudgetLimit] = useState("");
  const [budgetFormError, setBudgetFormError] = useState(null);

  const handleTabChange = (tab) => {
    router.replace(`/?tab=${tab}`, { scroll: false });
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, transactionsRes] = await Promise.all([
        fetch("/api/plaid/accounts"),
        fetch("/api/plaid/transactions"),
      ]);
      if (!accountsRes.ok || !transactionsRes.ok) {
        const failedResponse = !accountsRes.ok ? accountsRes : transactionsRes;
        const details = await failedResponse.json().catch(() => ({}));
        throw new Error(
          details.error ||
            "We couldn’t reach Plaid. Your existing data is still available.",
        );
      }
      const [accountsData, transactionsData] = await Promise.all([
        accountsRes.json(),
        transactionsRes.json(),
      ]);

      const normalizedAccounts = Array.isArray(accountsData)
        ? accountsData
        : [];
      const normalizedTransactions = Array.isArray(transactionsData)
        ? transactionsData
        : [];

      setAccounts(normalizedAccounts);
      setTransactions((prev) => {
        if (normalizedAccounts.length === 0) return [];

        const institutionNames = normalizedAccounts.map(
          (account) => account.institution_name,
        );
        return mergeTransactions(
          prev,
          normalizedTransactions,
          institutionNames,
        );
      });
    } catch (err) {
      setError({ message: err.message, retry: true });
    } finally {
      setLoading(false);
    }
  }, [setTransactions]);

  useEffect(() => {
    const initialFetch = window.setTimeout(fetchData, 0);
    return () => window.clearTimeout(initialFetch);
  }, [fetchData]);

  const createLinkToken = useCallback(async () => {
    try {
      setLinkError(null);
      const res = await fetch("/api/plaid/create-link-token", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.link_token) {
        throw new Error(
          data.error || "Bank connections are temporarily unavailable.",
        );
      }
      setLinkToken(data.link_token);
    } catch (err) {
      setLinkError(err.message);
    }
  }, []);

  useEffect(() => {
    const initialLinkToken = window.setTimeout(createLinkToken, 0);
    return () => window.clearTimeout(initialLinkToken);
  }, [createLinkToken]);

  const onPlaidSuccess = useCallback(
    async (publicToken, metadata) => {
      try {
        setConnecting(true);
        setError(null);
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution_name: metadata.institution?.name || "Unknown Bank",
          }),
        });
        if (!res.ok) {
          const details = await res.json().catch(() => ({}));
          throw new Error(
            details.error || "The bank connection could not be completed.",
          );
        }
        await fetchData();
      } catch (err) {
        setError({ message: err.message, retry: false });
      } finally {
        setConnecting(false);
      }
    },
    [fetchData],
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: (exitError) => {
      setConnecting(false);
      if (exitError) {
        setError({
          message: "The bank connection was interrupted. You can try again.",
          retry: false,
        });
      }
    },
  });

  const handleDisconnect = async (itemId) => {
    try {
      setError(null);
      const res = await fetch(`/api/plaid/item?item_id=${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const details = await res.json().catch(() => ({}));
        throw new Error(details.error || "The bank could not be disconnected.");
      }
      await fetchData();
    } catch (err) {
      setError({ message: err.message, retry: true });
    }
  };

  const accountsByInstitution = useMemo(
    () => groupAccountsByInstitution(accounts),
    [accounts],
  );
  const totalBalance = useMemo(() => getTotalBalance(accounts), [accounts]);
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, searchQuery),
    [transactions, searchQuery],
  );
  const categoryBreakdown = useMemo(
    () => getCategoryBreakdown(transactions),
    [transactions],
  );
  const cashFlowData = useMemo(
    () => getCashFlowData(transactions),
    [transactions],
  );
  const cashFlowTotals = useMemo(
    () => getCashFlowTotals(cashFlowData),
    [cashFlowData],
  );
  const budgetSpent = useMemo(
    () => getBudgetSpent(budgets, transactions),
    [budgets, transactions],
  );

  const handleCreateBudget = () => {
    const validationError = validateBudgetInput(budgetName, budgetLimit);
    if (validationError) {
      setBudgetFormError(validationError);
      return;
    }
    createBudget(budgetName.trim(), Number(budgetLimit));
    setBudgetName("");
    setBudgetLimit("");
    setBudgetFormError(null);
    setShowBudgetForm(false);
  };

  const CHART_COLORS = [
    "#1a6b54",
    "#2d8a6e",
    "#40a888",
    "#5bc4a2",
    "#78d4b6",
    "#96e0c8",
    "#b3ebd9",
    "#8b9e7c",
    "#6b8f5e",
    "#4a7d42",
  ];

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "cashflow", label: "Cash Flow" },
    { key: "budget", label: "Budget" },
  ];

  return (
    <main className="max-w-[1200px] mx-auto px-6 py-8">
      <DashboardHeader
        onConnect={() => {
          setConnecting(true);
          open();
        }}
        canConnect={ready && !linkError}
        connecting={connecting}
      />

      {/* Error */}
      {(error || linkError) && (
        <ErrorBanner
          message={error?.message || linkError}
          actionLabel={
            linkError ? "Retry connection" : error?.retry ? "Retry refresh" : undefined
          }
          onAction={linkError ? createLinkToken : error?.retry ? fetchData : undefined}
          onDismiss={() => {
            setError(null);
            setLinkError(null);
          }}
        />
      )}

      {/* Loading */}
      {loading ? (
        <DashboardLoading />
      ) : accounts.length === 0 ? (
        <EmptyAccounts
          onConnect={() => {
            setConnecting(true);
            open();
          }}
          canConnect={ready && !linkError}
          plaidUnavailable={Boolean(linkError)}
        />
      ) : (
        <>
          {/* Net Worth */}
          <div
            className="rounded-[10px] px-6 py-5 mb-6 animate-in stagger-1"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            <p
              className="text-[11px] font-500 uppercase tracking-[0.08em] mb-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Total Balance
            </p>
            <p
              className="text-[32px] font-700 tracking-tight tabular-nums"
              style={{ color: "var(--color-text)" }}
            >
              $
              {totalBalance.toLocaleString("en-US", {
                minimumFractionDigits: 2,
              })}
            </p>
            <p
              className="text-[12px] mt-1"
              style={{ color: "var(--color-text-muted)" }}
            >
              Across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-1 mb-6 animate-in stagger-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className="text-[11px] font-600 uppercase tracking-[0.08em] px-4 py-2 rounded-full transition-all"
                style={{
                  color:
                    activeTab === tab.key
                      ? "var(--color-accent)"
                      : "var(--color-text-muted)",
                  backgroundColor:
                    activeTab === tab.key ? "#f0fdf4" : "transparent",
                  border:
                    activeTab === tab.key
                      ? "1px solid var(--color-accent)"
                      : "1px solid transparent",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.key)
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.key)
                    e.currentTarget.style.color = "var(--color-text-muted)";
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Left Column — switches based on active tab */}
            <div className="space-y-5">
              {/* === OVERVIEW TAB === */}
              {activeTab === "overview" && (
                <>
                  {/* Accounts */}
                  <section className="animate-in">
                    <h2
                      className="text-[11px] font-600 uppercase tracking-[0.08em] mb-3"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Accounts
                    </h2>
                    <div className="space-y-3">
                      {Object.entries(accountsByInstitution).map(
                        ([institution, { accounts: accts, item_id }]) => (
                          <div
                            key={item_id}
                            className="rounded-[10px] p-4"
                            style={{
                              backgroundColor: "var(--color-card)",
                              border: "1px solid var(--color-border)",
                            }}
                          >
                            <div className="flex justify-between items-center mb-3">
                              <h3 className="text-[14px] font-600">
                                {institution}
                              </h3>
                              <button
                                onClick={() => handleDisconnect(item_id)}
                                className="text-[11px] font-500 transition-colors"
                                style={{ color: "var(--color-text-muted)" }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.color =
                                    "var(--color-negative)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.color =
                                    "var(--color-text-muted)")
                                }
                              >
                                Disconnect
                              </button>
                            </div>
                            <div className="space-y-2.5">
                              {accts.map((acct) => (
                                <div
                                  key={acct.account_id}
                                  className="flex justify-between items-center"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-[13px] font-500">
                                      {acct.name}
                                    </span>
                                    <span
                                      className="text-[10px] font-500 uppercase tracking-[0.04em] px-1.5 py-0.5 rounded-full"
                                      style={{
                                        backgroundColor: "var(--color-bg)",
                                        color: "var(--color-text-muted)",
                                      }}
                                    >
                                      {acct.subtype || acct.type}
                                    </span>
                                  </div>
                                  <span className="text-[13px] font-600 tabular-nums">
                                    $
                                    {acct.balances?.current?.toLocaleString(
                                      "en-US",
                                      { minimumFractionDigits: 2 },
                                    ) ?? "—"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </section>

                  {/* Spending Breakdown */}
                  {categoryBreakdown.length > 0 && (
                    <section className="animate-in">
                      <h2
                        className="text-[11px] font-600 uppercase tracking-[0.08em] mb-3"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Spending by Category
                      </h2>
                      <div
                        className="rounded-[10px] p-4"
                        style={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <ResponsiveContainer
                          width="100%"
                          height={categoryBreakdown.length * 34 + 16}
                        >
                          <BarChart
                            data={categoryBreakdown}
                            layout="vertical"
                            margin={{ left: 0, right: 16, top: 0, bottom: 0 }}
                          >
                            <XAxis type="number" hide />
                            <YAxis
                              type="category"
                              dataKey="category"
                              width={110}
                              tick={{ fontSize: 11, fill: "#78716c" }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip
                              cursor={{ fill: "rgba(0,0,0,0.03)" }}
                              contentStyle={{
                                backgroundColor: "#fff",
                                border: "1px solid var(--color-border)",
                                borderRadius: "8px",
                                fontSize: "12px",
                                boxShadow: "none",
                              }}
                              formatter={(value) =>
                                `$${value.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}`
                              }
                            />
                            <Bar
                              dataKey="total"
                              radius={[0, 4, 4, 0]}
                              barSize={14}
                            >
                              {categoryBreakdown.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </section>
                  )}
                </>
              )}

              {/* === CASH FLOW TAB === */}
              {activeTab === "cashflow" && (
                <section className="animate-in">
                  <h2
                    className="text-[11px] font-600 uppercase tracking-[0.08em] mb-3"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Cash Flow
                  </h2>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      {
                        label: "Total Income",
                        value: cashFlowTotals.income,
                        color: "var(--color-positive)",
                      },
                      {
                        label: "Total Expenses",
                        value: cashFlowTotals.expenses,
                        color: "var(--color-negative)",
                      },
                      {
                        label: "Net Flow",
                        value: cashFlowTotals.net,
                        color:
                          cashFlowTotals.net >= 0
                            ? "var(--color-positive)"
                            : "var(--color-negative)",
                      },
                    ].map((stat) => (
                      <div
                        key={stat.label}
                        className="rounded-[10px] p-3"
                        style={{
                          backgroundColor: "var(--color-card)",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <p
                          className="text-[10px] font-500 uppercase tracking-[0.08em] mb-1"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {stat.label}
                        </p>
                        <p
                          className="text-[18px] font-700 tabular-nums"
                          style={{ color: stat.color }}
                        >
                          {stat.label === "Net Flow" && stat.value >= 0
                            ? "+"
                            : stat.label === "Net Flow" && stat.value < 0
                              ? "-"
                              : ""}
                          $
                          {Math.abs(stat.value).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Chart */}
                  {cashFlowData.length > 0 ? (
                    <div
                      className="rounded-[10px] p-4"
                      style={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart
                          data={cashFlowData}
                          margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="monthLabel"
                            tick={{ fontSize: 11, fill: "#78716c" }}
                            axisLine={false}
                            tickLine={false}
                          />
                          <YAxis
                            tick={{ fontSize: 11, fill: "#78716c" }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `$${v}`}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#fff",
                              border: "1px solid var(--color-border)",
                              borderRadius: "8px",
                              fontSize: "12px",
                              boxShadow: "none",
                            }}
                            formatter={(value, name) => [
                              `$${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                              name === "income"
                                ? "Income"
                                : name === "expenses"
                                  ? "Expenses"
                                  : "Net",
                            ]}
                          />
                          <Bar
                            dataKey="income"
                            fill="#16a34a"
                            radius={[4, 4, 0, 0]}
                            barSize={20}
                          />
                          <Bar
                            dataKey="expenses"
                            fill="#dc2626"
                            radius={[4, 4, 0, 0]}
                            barSize={20}
                          />
                          <Line
                            type="monotone"
                            dataKey="net"
                            stroke="var(--color-accent)"
                            strokeWidth={2}
                            dot={{ r: 4, fill: "var(--color-accent)" }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div
                      className="rounded-[10px] p-8 text-center"
                      style={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      <p className="text-[13px]">
                        No transaction data available for cash flow analysis.
                      </p>
                    </div>
                  )}
                </section>
              )}

              {/* === BUDGET TAB === */}
              {activeTab === "budget" && (
                <section className="animate-in">
                  <div className="flex items-center justify-between mb-3">
                    <h2
                      className="text-[11px] font-600 uppercase tracking-[0.08em]"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      Budgets
                    </h2>
                    <button
                      onClick={() => setShowBudgetForm(!showBudgetForm)}
                      className="text-[12px] font-600 px-3 py-1.5 rounded-full text-white transition-colors"
                      style={{ backgroundColor: "var(--color-accent)" }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "var(--color-accent-hover)")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor =
                          "var(--color-accent)")
                      }
                    >
                      + New Budget
                    </button>
                  </div>

                  {/* Create Budget Form */}
                  {showBudgetForm && (
                    <div
                      className="rounded-[10px] p-4 mb-4 animate-in"
                      style={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <p
                        className="text-[12px] font-600 mb-3"
                        style={{ color: "var(--color-text)" }}
                      >
                        Create a Budget
                      </p>
                      <div className="space-y-2.5">
                        <input
                          type="text"
                          aria-label="Budget name"
                          aria-invalid={Boolean(budgetFormError)}
                          placeholder="Budget name (e.g., Groceries)"
                          value={budgetName}
                          onChange={(e) => {
                            setBudgetName(e.target.value);
                            setBudgetFormError(null);
                          }}
                          className="w-full text-[12px] px-3 py-2 rounded-lg outline-none transition-colors"
                          style={{
                            border: "1px solid var(--color-border)",
                            backgroundColor: "var(--color-bg)",
                            color: "var(--color-text)",
                          }}
                          onFocus={(e) =>
                            (e.currentTarget.style.borderColor =
                              "var(--color-accent)")
                          }
                          onBlur={(e) =>
                            (e.currentTarget.style.borderColor =
                              "var(--color-border)")
                          }
                        />
                        <input
                          type="number"
                          aria-label="Monthly limit"
                          aria-invalid={Boolean(budgetFormError)}
                          placeholder="Monthly limit ($)"
                          value={budgetLimit}
                          onChange={(e) => {
                            setBudgetLimit(e.target.value);
                            setBudgetFormError(null);
                          }}
                          min="1"
                          className="w-full text-[12px] px-3 py-2 rounded-lg outline-none transition-colors"
                          style={{
                            border: "1px solid var(--color-border)",
                            backgroundColor: "var(--color-bg)",
                            color: "var(--color-text)",
                          }}
                          onFocus={(e) =>
                            (e.currentTarget.style.borderColor =
                              "var(--color-accent)")
                          }
                          onBlur={(e) =>
                            (e.currentTarget.style.borderColor =
                              "var(--color-border)")
                          }
                        />
                        {budgetFormError && (
                          <p
                            role="alert"
                            className="text-[11px] font-500"
                            style={{ color: "var(--color-negative)" }}
                          >
                            {budgetFormError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateBudget}
                            className="text-[12px] font-600 px-4 py-2 rounded-lg text-white transition-colors"
                            style={{ backgroundColor: "var(--color-accent)" }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setShowBudgetForm(false);
                              setBudgetName("");
                              setBudgetLimit("");
                              setBudgetFormError(null);
                            }}
                            className="text-[12px] font-500 px-4 py-2 rounded-lg transition-colors"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Budget Cards */}
                  {budgets.length === 0 && !showBudgetForm ? (
                    <div
                      className="rounded-[10px] p-8 text-center"
                      style={{
                        backgroundColor: "var(--color-card)",
                        border: "1px solid var(--color-border)",
                      }}
                    >
                      <p
                        className="text-[14px] font-500 mb-1"
                        style={{ color: "var(--color-text)" }}
                      >
                        No budgets yet
                      </p>
                      <p
                        className="text-[12px]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Create your first budget to start tracking spending.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {budgets.map((budget) => {
                        const spent =
                          Math.round((budgetSpent[budget.id] || 0) * 100) / 100;
                        const pct =
                          budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
                        const isOver = pct > 100;

                        return (
                          <div
                            key={budget.id}
                            className="rounded-[10px] p-4 cursor-pointer transition-all"
                            style={{
                              backgroundColor: "var(--color-card)",
                              border: "1px solid var(--color-border)",
                            }}
                            onClick={() => router.push(`/budget/${budget.id}`)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor =
                                "var(--color-accent)";
                              e.currentTarget.style.boxShadow =
                                "0 1px 4px rgba(0,0,0,0.04)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor =
                                "var(--color-border)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <h3
                                className="text-[14px] font-600"
                                style={{ color: "var(--color-text)" }}
                              >
                                {budget.name}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(`Delete "${budget.name}" budget?`)
                                  ) {
                                    deleteBudget(budget.id);
                                  }
                                }}
                                className="text-[11px] font-500 transition-colors ml-2"
                                style={{ color: "var(--color-text-muted)" }}
                                onMouseEnter={(e) =>
                                  (e.currentTarget.style.color =
                                    "var(--color-negative)")
                                }
                                onMouseLeave={(e) =>
                                  (e.currentTarget.style.color =
                                    "var(--color-text-muted)")
                                }
                              >
                                &times;
                              </button>
                            </div>

                            {/* Progress Bar */}
                            <div
                              className="w-full h-3 rounded-full mb-2 overflow-hidden"
                              style={{ backgroundColor: "var(--color-bg)" }}
                            >
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min(pct, 100)}%`,
                                  backgroundColor: getProgressColor(pct),
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>

                            <div className="flex justify-between items-center">
                              <p
                                className="text-[12px] tabular-nums"
                                style={{ color: "var(--color-text-secondary)" }}
                              >
                                $
                                {spent.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}{" "}
                                / $
                                {budget.limit.toLocaleString("en-US", {
                                  minimumFractionDigits: 2,
                                })}{" "}
                                spent
                              </p>
                              {isOver ? (
                                <span
                                  className="text-[10px] font-600 px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor: "var(--color-negative-bg)",
                                    color: "var(--color-negative)",
                                  }}
                                >
                                  Over by $
                                  {(spent - budget.limit).toLocaleString(
                                    "en-US",
                                    { minimumFractionDigits: 2 },
                                  )}
                                </span>
                              ) : (
                                <span
                                  className="text-[11px] tabular-nums"
                                  style={{ color: "var(--color-text-muted)" }}
                                >
                                  {Math.round(pct)}%
                                </span>
                              )}
                            </div>

                            <p
                              className="text-[11px] mt-2"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {budget.transactionIds.length} transaction
                              {budget.transactionIds.length !== 1 ? "s" : ""}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>

            {/* Right: Transactions */}
            <div className="lg:col-span-2 animate-in">
              <div className="flex items-center justify-between mb-3">
                <h2
                  className="text-[11px] font-600 uppercase tracking-[0.08em]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  Transactions
                  <span className="ml-1.5 font-400 normal-case tracking-normal">
                    ({filteredTransactions.length})
                  </span>
                </h2>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#a8a29e"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search merchants..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="text-[12px] pl-8 pr-3 py-2 rounded-lg w-52 outline-none transition-colors"
                    style={{
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-card)",
                      color: "var(--color-text)",
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--color-accent)")
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor =
                        "var(--color-border)")
                    }
                  />
                </div>
              </div>

              <div
                className="rounded-[10px] overflow-hidden"
                style={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                }}
              >
                <table className="w-full text-[13px]">
                  <thead>
                    <tr
                      style={{
                        borderBottom: "1px solid var(--color-border)",
                      }}
                    >
                      <th
                        className="px-4 py-2.5 text-left text-[10px] font-600 uppercase tracking-[0.06em]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Date
                      </th>
                      <th
                        className="px-4 py-2.5 text-left text-[10px] font-600 uppercase tracking-[0.06em]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Merchant
                      </th>
                      <th
                        className="px-4 py-2.5 text-left text-[10px] font-600 uppercase tracking-[0.06em] hidden md:table-cell"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Category
                      </th>
                      <th
                        className="px-4 py-2.5 text-left text-[10px] font-600 uppercase tracking-[0.06em] hidden lg:table-cell"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Account
                      </th>
                      <th
                        className="px-4 py-2.5 text-right text-[10px] font-600 uppercase tracking-[0.06em]"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={5}>
                          <EmptyTransactions
                            hasSearch={Boolean(searchQuery.trim())}
                            onClearSearch={() => setSearchQuery("")}
                          />
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((txn, i) => (
                        <tr
                          key={txn.transaction_id || i}
                          className="transition-colors"
                          style={{
                            borderBottom:
                              i < filteredTransactions.length - 1
                                ? "1px solid var(--color-border)"
                                : "none",
                          }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.backgroundColor = "#faf9f7")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.backgroundColor =
                              "transparent")
                          }
                        >
                          <td
                            className="px-4 py-3 whitespace-nowrap tabular-nums"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {txn.date}
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-500">
                              {txn.merchant_name || txn.name}
                            </div>
                            <div
                              className="text-[11px] mt-0.5 lg:hidden"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {txn.institution_name}
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell">
                            {txn.personal_finance_category?.primary ? (
                              <span
                                className="inline-block text-[10px] font-500 px-2 py-0.5 rounded-full"
                                style={{
                                  backgroundColor: "var(--color-bg)",
                                  color: "var(--color-text-secondary)",
                                }}
                              >
                                {sentenceCase(
                                  txn.personal_finance_category.primary,
                                )}
                              </span>
                            ) : (
                              <span
                                style={{ color: "var(--color-text-muted)" }}
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td
                            className="px-4 py-3 hidden lg:table-cell text-[12px]"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            {txn.institution_name}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className="inline-block text-[12px] font-600 tabular-nums px-2 py-0.5 rounded-md"
                              style={{
                                backgroundColor:
                                  txn.amount > 0
                                    ? "var(--color-negative-bg)"
                                    : "var(--color-positive-bg)",
                                color:
                                  txn.amount > 0
                                    ? "var(--color-negative)"
                                    : "var(--color-positive)",
                              }}
                            >
                              {txn.amount > 0 ? "-" : "+"}$
                              {Math.abs(txn.amount).toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                              })}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
