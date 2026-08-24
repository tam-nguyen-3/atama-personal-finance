import { describe, expect, it } from "vitest";
import {
  filterTransactions,
  getBudgetSpent,
  getCashFlowData,
  getCashFlowTotals,
  getCategoryBreakdown,
  mergeTransactions,
  validateBudgetInput,
} from "@/lib/dashboard";
import type { Budget, DashboardTransaction } from "@/types/finance";

const transactions: DashboardTransaction[] = [
  {
    transaction_id: "expense-1",
    account_id: "checking",
    institution_name: "Tartan Bank",
    merchant_name: "Corner Market",
    name: "Corner Market",
    date: "2026-08-12",
    amount: 42.129,
    personal_finance_category: { primary: "FOOD_AND_DRINK" },
  },
  {
    transaction_id: "income-1",
    account_id: "checking",
    institution_name: "Tartan Bank",
    name: "Payroll",
    date: "2026-08-01",
    amount: -2500,
  },
  {
    transaction_id: "expense-2",
    account_id: "checking",
    institution_name: "First Platypus Bank",
    name: "Train pass",
    date: "2026-07-28",
    amount: 80,
    personal_finance_category: { primary: "TRANSPORTATION" },
  },
];

describe("dashboard calculations", () => {
  it("merges, deduplicates, filters institutions, and sorts newest first", () => {
    const updatedExpense = { ...transactions[0]!, amount: 45 };
    const result = mergeTransactions(
      transactions,
      [updatedExpense],
      ["Tartan Bank"],
    );

    expect(result).toHaveLength(2);
    expect(result[0]?.transaction_id).toBe("expense-1");
    expect(result[0]?.amount).toBe(45);
  });

  it("aggregates expenses by normalized category", () => {
    expect(getCategoryBreakdown(transactions)).toEqual([
      { category: "Transportation", total: 80 },
      { category: "Food and drink", total: 42.13 },
    ]);
  });

  it("builds monthly cash flow and totals", () => {
    const cashFlow = getCashFlowData(transactions);

    expect(cashFlow).toEqual([
      {
        month: "2026-07",
        monthLabel: "Jul",
        income: 0,
        expenses: 80,
        net: -80,
      },
      {
        month: "2026-08",
        monthLabel: "Aug",
        income: 2500,
        expenses: 42.13,
        net: 2457.87,
      },
    ]);
    expect(getCashFlowTotals(cashFlow)).toEqual({
      income: 2500,
      expenses: 122.13,
      net: 2377.87,
    });
  });

  it("totals only assigned expense transactions for each budget", () => {
    const budgets: Budget[] = [
      {
        id: "groceries",
        name: "Groceries",
        limit: 200,
        transactionIds: ["expense-1", "income-1", "missing"],
      },
    ];

    expect(getBudgetSpent(budgets, transactions)).toEqual({
      groceries: 42.13,
    });
  });

  it("searches merchant, transaction, and institution names", () => {
    expect(filterTransactions(transactions, "platypus")).toEqual([
      transactions[2],
    ]);
    expect(filterTransactions(transactions, "payroll")).toEqual([
      transactions[1],
    ]);
  });
});

describe("budget validation", () => {
  it("requires a name and a positive numeric limit", () => {
    expect(validateBudgetInput("", "100")).toBe("Add a budget name.");
    expect(validateBudgetInput("Groceries", "0")).toBe(
      "Enter a monthly limit greater than $0.",
    );
    expect(validateBudgetInput("Groceries", "100")).toBeNull();
  });
});
