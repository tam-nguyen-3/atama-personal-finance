"use client";

import { use, useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useBudgets } from "../../../components/BudgetContext";
import { useTransactions } from "../../../components/TransactionContext";
import {
  getProgressColor,
  sentenceCase,
} from "@/lib/dashboard";
import { ErrorBanner } from "../../../components/dashboard/DashboardStates";
import { getApiErrorMessage, getErrorMessage } from "@/lib/errors";
import type { TransactionsPage } from "@/types/finance";

export default function BudgetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    budgets,
    loaded,
    updateBudget,
    addTransactionToBudget,
    removeTransactionFromBudget,
    deleteBudget,
  } = useBudgets();
  const { transactions, setTransactions } = useTransactions();

  const [loadingTxns, setLoadingTxns] = useState(
    () => transactions.length === 0,
  );
  const [transactionError, setTransactionError] = useState<string | null>(null);
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editLimit, setEditLimit] = useState("");

  const budget = budgets.find((b) => b.id === id);

  // Fetch transactions from API
  const fetchTransactions = useCallback(async () => {
    if (transactions.length === 0) setLoadingTxns(true);
    setTransactionError(null);
    try {
      const res = await fetch("/api/transactions?limit=500");
      if (!res.ok) {
        throw new Error(
          getApiErrorMessage(
            await res.json().catch(() => null),
            "We couldn’t refresh the available transactions.",
          ),
        );
      }
      const data: unknown = await res.json();
      const incoming =
        data && typeof data === "object" && "data" in data && Array.isArray(data.data)
          ? (data as TransactionsPage).data
          : [];
      setTransactions(incoming);
    } catch (error) {
      setTransactionError(getErrorMessage(error));
    } finally {
      setLoadingTxns(false);
    }
  }, [setTransactions, transactions.length]);

  useEffect(() => {
    const initialFetch = window.setTimeout(fetchTransactions, 0);
    return () => window.clearTimeout(initialFetch);
  }, [fetchTransactions]);

  // All transaction IDs assigned to any budget
  const allAssignedIds = useMemo(() => {
    const ids = new Set();
    for (const b of budgets) {
      for (const tid of b.transactionIds) ids.add(tid);
    }
    return ids;
  }, [budgets]);

  // Transactions assigned to this budget
  const assignedTransactions = useMemo(() => {
    if (!budget) return [];
    const idSet = new Set(budget.transactionIds);
    return transactions.filter((txn) => idSet.has(txn.transaction_id));
  }, [transactions, budget]);

  // Unassigned expense transactions (available to add)
  const unassignedTransactions = useMemo(() => {
    return transactions.filter(
      (txn) => txn.amount > 0 && !allAssignedIds.has(txn.transaction_id),
    );
  }, [transactions, allAssignedIds]);

  const filteredUnassigned = useMemo(() => {
    if (!addSearch) return unassignedTransactions;
    const q = addSearch.toLowerCase();
    return unassignedTransactions.filter(
      (txn) =>
        txn.merchant_name?.toLowerCase().includes(q) ||
        txn.name?.toLowerCase().includes(q),
    );
  }, [unassignedTransactions, addSearch]);

  const spent = useMemo(() => {
    return assignedTransactions.reduce(
      (sum, txn) => sum + (txn.amount > 0 ? txn.amount : 0),
      0,
    );
  }, [assignedTransactions]);

  const handleStartEdit = () => {
    if (!budget) return;
    setEditName(budget.name);
    setEditLimit(String(budget.limit));
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editLimit || Number(editLimit) <= 0) return;
    try {
      await updateBudget(id, {
        name: editName.trim(),
        limit: Number(editLimit),
      });
      setEditing(false);
    } catch (error) {
      setTransactionError(getErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (budget && confirm(`Delete "${budget.name}" budget?`)) {
      try {
        await deleteBudget(id);
        router.push("/dashboard?tab=budget");
      } catch (error) {
        setTransactionError(getErrorMessage(error));
      }
    }
  };

  const handleAssignment = async (
    action: (budgetId: string, transactionId: string) => Promise<void>,
    transactionId: string,
  ) => {
    try {
      setTransactionError(null);
      await action(id, transactionId);
    } catch (error) {
      setTransactionError(getErrorMessage(error));
    }
  };

  if (!loaded || loadingTxns) {
    return (
      <main className="max-w-[800px] mx-auto px-6 py-8">
        <div className="animate-in">
          <div className="skeleton h-8 w-40 mb-6" />
          <div className="skeleton h-[120px] w-full mb-6" />
          <div className="skeleton h-[300px] w-full" />
        </div>
      </main>
    );
  }

  if (!budget) {
    return (
      <main className="max-w-[800px] mx-auto px-6 py-8">
        <div className="text-center py-20 animate-in">
          <p
            className="text-[16px] font-500 mb-2"
            style={{ color: "var(--color-text)" }}
          >
            Budget not found
          </p>
          <p
            className="text-[13px] mb-6"
            style={{ color: "var(--color-text-muted)" }}
          >
            This budget may have been deleted.
          </p>
          <button
            onClick={() => router.push("/dashboard?tab=budget")}
            className="text-[13px] font-600 px-5 py-2.5 rounded-full text-white"
            style={{ backgroundColor: "var(--color-accent)" }}
          >
            Back to Budgets
          </button>
        </div>
      </main>
    );
  }

  const pct = budget.limit > 0 ? (spent / budget.limit) * 100 : 0;
  const isOver = pct > 100;
  const roundedSpent = Math.round(spent * 100) / 100;

  return (
    <main className="max-w-[800px] mx-auto px-6 py-8">
      {transactionError && (
        <ErrorBanner
          message={transactionError}
          onAction={fetchTransactions}
          onDismiss={() => setTransactionError(null)}
        />
      )}
      {/* Back Button */}
      <button
        onClick={() => router.push("/dashboard?tab=budget")}
        className="flex items-center gap-1.5 text-[13px] font-500 mb-6 transition-colors animate-in"
        style={{ color: "var(--color-text-muted)" }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--color-accent)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--color-text-muted)")
        }
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        Back to Dashboard
      </button>

      {/* Budget Header */}
      <div
        className="rounded-[10px] p-5 mb-6 animate-in stagger-1"
        style={{
          backgroundColor: "var(--color-card)",
          border: "1px solid var(--color-border)",
        }}
      >
        {editing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full text-[16px] font-600 px-3 py-2 rounded-lg outline-none"
              style={{
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-border)")
              }
            />
            <input
              type="number"
              value={editLimit}
              onChange={(e) => setEditLimit(e.target.value)}
              min="1"
              placeholder="Monthly limit ($)"
              className="w-full text-[13px] px-3 py-2 rounded-lg outline-none"
              style={{
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-bg)",
                color: "var(--color-text)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--color-border)")
              }
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveEdit}
                className="text-[12px] font-600 px-4 py-2 rounded-lg text-white"
                style={{ backgroundColor: "var(--color-accent)" }}
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-[12px] font-500 px-4 py-2 rounded-lg"
                style={{ color: "var(--color-text-muted)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-start mb-4">
              <h1
                className="text-[20px] font-700"
                style={{ color: "var(--color-text)" }}
              >
                {budget.name}
              </h1>
              <div className="flex gap-2">
                <button
                  onClick={handleStartEdit}
                  className="text-[11px] font-500 px-3 py-1 rounded-full transition-colors"
                  style={{
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-secondary)",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-border)")
                  }
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="text-[11px] font-500 px-3 py-1 rounded-full transition-colors"
                  style={{
                    border: "1px solid var(--color-border)",
                    color: "var(--color-text-muted)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-negative)";
                    e.currentTarget.style.color = "var(--color-negative)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.color = "var(--color-text-muted)";
                  }}
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div
              className="w-full h-4 rounded-full mb-2 overflow-hidden"
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
                className="text-[13px] tabular-nums"
                style={{ color: "var(--color-text-secondary)" }}
              >
                $
                {roundedSpent.toLocaleString("en-US", {
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
                  className="text-[11px] font-600 px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: "var(--color-negative-bg)",
                    color: "var(--color-negative)",
                  }}
                >
                  Over by $
                  {(roundedSpent - budget.limit).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              ) : (
                <span
                  className="text-[12px] tabular-nums"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {Math.round(pct)}%
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Assigned Transactions */}
      <section className="animate-in stagger-2">
        <h2
          className="text-[11px] font-600 uppercase tracking-[0.08em] mb-3"
          style={{ color: "var(--color-text-muted)" }}
        >
          Assigned Transactions
          <span className="ml-1.5 font-400 normal-case tracking-normal">
            ({assignedTransactions.length})
          </span>
        </h2>

        <div
          className="rounded-[10px] overflow-hidden mb-4"
          style={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
          }}
        >
          {assignedTransactions.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p
                className="text-[13px]"
                style={{ color: "var(--color-text-muted)" }}
              >
                No transactions assigned yet. Add transactions below.
              </p>
            </div>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
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
                    className="px-4 py-2.5 text-right text-[10px] font-600 uppercase tracking-[0.06em]"
                    style={{ color: "var(--color-text-muted)" }}
                  >
                    Amount
                  </th>
                  <th
                    className="px-4 py-2.5 text-center text-[10px] font-600 uppercase tracking-[0.06em]"
                    style={{ color: "var(--color-text-muted)", width: "60px" }}
                  ></th>
                </tr>
              </thead>
              <tbody>
                {assignedTransactions.map((txn, i) => (
                  <tr
                    key={txn.transaction_id || i}
                    className="transition-colors"
                    style={{
                      borderBottom:
                        i < assignedTransactions.length - 1
                          ? "1px solid var(--color-border)"
                          : "none",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor = "#faf9f7")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td
                      className="px-4 py-3 whitespace-nowrap tabular-nums"
                      style={{ color: "var(--color-text-muted)" }}
                    >
                      {txn.date}
                    </td>
                    <td className="px-4 py-3 font-500">
                      {txn.merchant_name || txn.name}
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
                          {sentenceCase(txn.personal_finance_category.primary)}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-muted)" }}>
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="text-[12px] font-600 tabular-nums px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: "var(--color-negative-bg)",
                          color: "var(--color-negative)",
                        }}
                      >
                        -$
                        {Math.abs(txn.amount).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          void handleAssignment(
                            removeTransactionFromBudget,
                            txn.transaction_id,
                          );
                        }}
                        className="text-[13px] transition-colors"
                        style={{ color: "var(--color-text-muted)" }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.color =
                            "var(--color-negative)")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.color =
                            "var(--color-text-muted)")
                        }
                        title="Remove from budget"
                      >
                        &times;
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Add Transactions */}
      <section className="animate-in stagger-3">
        <button
          onClick={() => setShowAddPanel(!showAddPanel)}
          className="text-[12px] font-600 px-4 py-2 rounded-full text-white transition-colors mb-4"
          style={{ backgroundColor: "var(--color-accent)" }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor =
              "var(--color-accent-hover)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--color-accent)")
          }
        >
          {showAddPanel ? "Hide" : "+ Add Transactions"}
        </button>

        {showAddPanel && (
          <div
            className="rounded-[10px] overflow-hidden animate-in"
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
            }}
          >
            {/* Search */}
            <div
              className="p-3"
              style={{ borderBottom: "1px solid var(--color-border)" }}
            >
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
                  placeholder="Search unassigned transactions..."
                  value={addSearch}
                  onChange={(e) => setAddSearch(e.target.value)}
                  className="w-full text-[12px] pl-8 pr-3 py-2 rounded-lg outline-none transition-colors"
                  style={{
                    border: "1px solid var(--color-border)",
                    backgroundColor: "var(--color-bg)",
                    color: "var(--color-text)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--color-border)")
                  }
                />
              </div>
            </div>

            {filteredUnassigned.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p
                  className="text-[13px]"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {unassignedTransactions.length === 0
                    ? "All expense transactions are assigned to budgets."
                    : "No matching transactions found."}
                </p>
              </div>
            ) : (
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      <th
                        className="px-4 py-2.5 text-left text-[10px] font-600 uppercase tracking-[0.06em] sticky top-0"
                        style={{
                          color: "var(--color-text-muted)",
                          backgroundColor: "var(--color-card)",
                        }}
                      >
                        Date
                      </th>
                      <th
                        className="px-4 py-2.5 text-left text-[10px] font-600 uppercase tracking-[0.06em] sticky top-0"
                        style={{
                          color: "var(--color-text-muted)",
                          backgroundColor: "var(--color-card)",
                        }}
                      >
                        Merchant
                      </th>
                      <th
                        className="px-4 py-2.5 text-right text-[10px] font-600 uppercase tracking-[0.06em] sticky top-0"
                        style={{
                          color: "var(--color-text-muted)",
                          backgroundColor: "var(--color-card)",
                        }}
                      >
                        Amount
                      </th>
                      <th
                        className="px-4 py-2.5 text-center sticky top-0"
                        style={{
                          backgroundColor: "var(--color-card)",
                          width: "60px",
                        }}
                      ></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUnassigned.map((txn, i) => (
                      <tr
                        key={txn.transaction_id || i}
                        className="transition-colors"
                        style={{
                          borderBottom:
                            i < filteredUnassigned.length - 1
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
                          className="px-4 py-2.5 whitespace-nowrap tabular-nums text-[12px]"
                          style={{ color: "var(--color-text-muted)" }}
                        >
                          {txn.date}
                        </td>
                        <td className="px-4 py-2.5 font-500 text-[12px]">
                          {txn.merchant_name || txn.name}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className="text-[11px] font-600 tabular-nums"
                            style={{ color: "var(--color-text-secondary)" }}
                          >
                            $
                            {txn.amount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => {
                              void handleAssignment(
                                addTransactionToBudget,
                                txn.transaction_id,
                              );
                            }}
                            className="text-[11px] font-600 px-2.5 py-1 rounded-full text-white transition-colors"
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
                            + Add
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
