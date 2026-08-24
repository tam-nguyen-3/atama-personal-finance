const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

export function sentenceCase(value: string | null | undefined): string {
  if (!value) return "";
  const normalized = value.replace(/_/g, " ").toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function mergeTransactions(
  existing: DashboardTransaction[],
  incoming: DashboardTransaction[],
  institutionNames?: string[],
): DashboardTransaction[] {
  const allowed = institutionNames ? new Set(institutionNames) : null;
  const transactions = new Map();

  for (const transaction of [...existing, ...incoming]) {
    if (allowed && !allowed.has(transaction.institution_name)) continue;

    const key =
      transaction.transaction_id ||
      `${transaction.account_id}-${transaction.date}-${transaction.amount}-${transaction.name}`;
    transactions.set(key, transaction);
  }

  return Array.from(transactions.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function groupAccountsByInstitution(
  accounts: DashboardAccount[],
): Record<string, InstitutionAccountGroup> {
  return accounts.reduce<Record<string, InstitutionAccountGroup>>((groups, account) => {
    const institution = account.institution_name || "Unknown institution";
    if (!groups[institution]) {
      groups[institution] = { accounts: [], item_id: account.item_id };
    }
    groups[institution].accounts.push(account);
    return groups;
  }, {});
}

export function getTotalBalance(accounts: DashboardAccount[]): number {
  return roundCurrency(
    accounts.reduce(
      (total, account) => total + (account.balances?.current || 0),
      0,
    ),
  );
}

export function filterTransactions(
  transactions: DashboardTransaction[],
  query: string,
): DashboardTransaction[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return transactions;

  return transactions.filter((transaction) =>
    [transaction.merchant_name, transaction.name, transaction.institution_name]
      .filter((value): value is string => Boolean(value))
      .some((value) => value.toLowerCase().includes(normalizedQuery)),
  );
}

export function getCategoryBreakdown(
  transactions: DashboardTransaction[],
): CategoryTotal[] {
  const totals: Record<string, number> = {};

  for (const transaction of transactions) {
    if (transaction.amount <= 0) continue;
    const category =
      transaction.personal_finance_category?.primary || "UNCATEGORIZED";
    totals[category] = (totals[category] || 0) + transaction.amount;
  }

  return Object.entries(totals)
    .map(([category, total]) => ({
      category: sentenceCase(category),
      total: roundCurrency(total),
    }))
    .sort((a, b) => b.total - a.total);
}

export function getCashFlowData(
  transactions: DashboardTransaction[],
): CashFlowPoint[] {
  const months: Record<string, { income: number; expenses: number }> = {};

  for (const transaction of transactions) {
    const month = transaction.date?.slice(0, 7);
    if (!month) continue;
    if (!months[month]) months[month] = { income: 0, expenses: 0 };

    if (transaction.amount < 0) {
      months[month].income += Math.abs(transaction.amount);
    } else {
      months[month].expenses += transaction.amount;
    }
  }

  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, values]) => {
      const monthNumber = Number(month.split("-")[1]);
      const income = roundCurrency(values.income);
      const expenses = roundCurrency(values.expenses);
      return {
        month,
        monthLabel: MONTH_LABELS[monthNumber - 1] ?? month,
        income,
        expenses,
        net: roundCurrency(income - expenses),
      };
    });
}

export function getCashFlowTotals(
  cashFlowData: CashFlowPoint[],
): CashFlowTotals {
  const totals = cashFlowData.reduce(
    (result, month) => ({
      income: result.income + month.income,
      expenses: result.expenses + month.expenses,
    }),
    { income: 0, expenses: 0 },
  );

  return {
    income: roundCurrency(totals.income),
    expenses: roundCurrency(totals.expenses),
    net: roundCurrency(totals.income - totals.expenses),
  };
}

export function getBudgetSpent(
  budgets: Budget[],
  transactions: DashboardTransaction[],
): Record<string, number> {
  const expenseAmounts = new Map(
    transactions
      .filter((transaction) => transaction.amount > 0)
      .map((transaction) => [transaction.transaction_id, transaction.amount]),
  );

  return Object.fromEntries(
    budgets.map((budget) => [
      budget.id,
      roundCurrency(
        budget.transactionIds.reduce(
          (total, transactionId) =>
            total + (expenseAmounts.get(transactionId) || 0),
          0,
        ),
      ),
    ]),
  );
}

export function getProgressColor(percent: number): string {
  if (percent < 60) return "var(--color-positive)";
  if (percent < 85) return "#f59e0b";
  return "var(--color-negative)";
}

export function validateBudgetInput(
  name: string,
  limit: string | number,
): string | null {
  if (!name.trim()) return "Add a budget name.";
  if (!limit || !Number.isFinite(Number(limit)) || Number(limit) <= 0) {
    return "Enter a monthly limit greater than $0.";
  }
  return null;
}
import type {
  Budget,
  CashFlowPoint,
  CashFlowTotals,
  CategoryTotal,
  DashboardAccount,
  DashboardTransaction,
  InstitutionAccountGroup,
} from "@/types/finance";
