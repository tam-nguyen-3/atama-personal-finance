import "server-only";

import {
  and,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
} from "drizzle-orm";
import { ApiError } from "@/lib/api";
import {
  decodeTransactionCursor,
  encodeTransactionCursor,
} from "@/lib/transactions-cursor";
import type {
  Budget,
  BudgetUpdates,
  DashboardAccount,
  DashboardTransaction,
  TransactionsPage,
} from "@/types/finance";
import { getDb } from "./index";
import {
  accounts,
  budgets,
  budgetTransactions,
  LOCAL_USER_ID,
  plaidItems,
  transactions,
} from "./schema";

function numberOrNull(value: string | null): number | null {
  return value === null ? null : Number(value);
}

export async function listAccounts(): Promise<DashboardAccount[]> {
  const rows = await getDb()
    .select({ account: accounts, item: plaidItems })
    .from(accounts)
    .innerJoin(plaidItems, eq(accounts.itemId, plaidItems.id))
    .where(
      and(
        eq(accounts.userId, LOCAL_USER_ID),
        inArray(plaidItems.status, ["active", "error"]),
        isNull(accounts.archivedAt),
      ),
    )
    .orderBy(accounts.name);

  return rows.map(({ account, item }) => ({
    account_id: account.id,
    name: account.name,
    type: account.type,
    subtype: account.subtype,
    balances: {
      current: numberOrNull(account.currentBalance),
      available: numberOrNull(account.availableBalance),
      iso_currency_code: account.isoCurrencyCode,
    },
    institution_name: item.institutionName,
    item_id: item.id,
  }));
}

export async function listTransactions(options: {
  limit: number;
  cursor?: string;
  query?: string;
}): Promise<TransactionsPage> {
  const cursor = options.cursor
    ? decodeTransactionCursor(options.cursor)
    : undefined;
  const query = options.query?.trim();
  const search = query
    ? or(
        ilike(transactions.name, `%${query}%`),
        ilike(transactions.merchantName, `%${query}%`),
        ilike(transactions.institutionName, `%${query}%`),
      )
    : undefined;
  const afterCursor = cursor
    ? or(
        lt(transactions.date, cursor.date),
        and(
          eq(transactions.date, cursor.date),
          lt(transactions.id, cursor.id),
        ),
      )
    : undefined;

  const rows = await getDb()
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, LOCAL_USER_ID),
        isNull(transactions.removedAt),
        search,
        afterCursor,
      ),
    )
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(options.limit + 1);

  const hasMore = rows.length > options.limit;
  const pageRows = hasMore ? rows.slice(0, options.limit) : rows;
  const data: DashboardTransaction[] = pageRows.map((transaction) => ({
    transaction_id: transaction.id,
    account_id: transaction.accountId ?? undefined,
    date: transaction.date,
    amount: Number(transaction.amount),
    name: transaction.name,
    merchant_name: transaction.merchantName,
    personal_finance_category: transaction.categoryPrimary
      ? {
          primary: transaction.categoryPrimary,
          detailed: transaction.categoryDetailed ?? undefined,
        }
      : null,
    institution_name: transaction.institutionName,
  }));
  const last = pageRows.at(-1);

  return {
    data,
    nextCursor:
      hasMore && last
        ? encodeTransactionCursor({ date: last.date, id: last.id })
        : null,
  };
}

export async function listBudgets(): Promise<Budget[]> {
  const budgetRows = await getDb()
    .select()
    .from(budgets)
    .where(eq(budgets.userId, LOCAL_USER_ID))
    .orderBy(budgets.createdAt);

  if (budgetRows.length === 0) return [];

  const assignments = await getDb()
    .select()
    .from(budgetTransactions)
    .where(
      inArray(
        budgetTransactions.budgetId,
        budgetRows.map((budget) => budget.id),
      ),
    );
  const transactionIdsByBudget = new Map<string, string[]>();
  for (const assignment of assignments) {
    const ids = transactionIdsByBudget.get(assignment.budgetId) ?? [];
    ids.push(assignment.transactionId);
    transactionIdsByBudget.set(assignment.budgetId, ids);
  }

  return budgetRows.map((budget) => ({
    id: budget.id,
    name: budget.name,
    limit: Number(budget.limit),
    transactionIds: transactionIdsByBudget.get(budget.id) ?? [],
  }));
}

export async function getBudget(id: string): Promise<Budget> {
  const budget = (await listBudgets()).find((candidate) => candidate.id === id);
  if (!budget) {
    throw new ApiError(404, "NOT_FOUND", "Budget not found.");
  }
  return budget;
}

export async function createBudget(input: {
  name: string;
  limit: number;
}): Promise<Budget> {
  const [created] = await getDb()
    .insert(budgets)
    .values({
      userId: LOCAL_USER_ID,
      name: input.name,
      limit: input.limit.toFixed(2),
    })
    .returning();
  if (!created) throw new Error("The budget insert returned no row.");
  return {
    id: created.id,
    name: created.name,
    limit: Number(created.limit),
    transactionIds: [],
  };
}

export async function updateBudget(
  id: string,
  updates: BudgetUpdates,
): Promise<Budget> {
  const values: { name?: string; limit?: string; updatedAt: Date } = {
    updatedAt: new Date(),
  };
  if (updates.name !== undefined) values.name = updates.name;
  if (updates.limit !== undefined) values.limit = updates.limit.toFixed(2);

  const [updated] = await getDb()
    .update(budgets)
    .set(values)
    .where(and(eq(budgets.id, id), eq(budgets.userId, LOCAL_USER_ID)))
    .returning({ id: budgets.id });
  if (!updated) throw new ApiError(404, "NOT_FOUND", "Budget not found.");
  return getBudget(id);
}

export async function deleteBudget(id: string): Promise<void> {
  const [deleted] = await getDb()
    .delete(budgets)
    .where(and(eq(budgets.id, id), eq(budgets.userId, LOCAL_USER_ID)))
    .returning({ id: budgets.id });
  if (!deleted) throw new ApiError(404, "NOT_FOUND", "Budget not found.");
}

export async function assignTransaction(
  budgetId: string,
  transactionId: string,
): Promise<Budget> {
  await getBudget(budgetId);
  const [transaction] = await getDb()
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.userId, LOCAL_USER_ID),
        isNull(transactions.removedAt),
      ),
    )
    .limit(1);
  if (!transaction) {
    throw new ApiError(404, "NOT_FOUND", "Transaction not found.");
  }

  const [existing] = await getDb()
    .select({ budgetId: budgetTransactions.budgetId })
    .from(budgetTransactions)
    .where(eq(budgetTransactions.transactionId, transactionId))
    .limit(1);
  if (existing && existing.budgetId !== budgetId) {
    throw new ApiError(
      409,
      "CONFLICT",
      "This transaction is already assigned to another budget.",
    );
  }
  if (!existing) {
    await getDb()
      .insert(budgetTransactions)
      .values({ budgetId, transactionId });
  }
  return getBudget(budgetId);
}

export async function unassignTransaction(
  budgetId: string,
  transactionId: string,
): Promise<Budget> {
  await getBudget(budgetId);
  await getDb()
    .delete(budgetTransactions)
    .where(
      and(
        eq(budgetTransactions.budgetId, budgetId),
        eq(budgetTransactions.transactionId, transactionId),
      ),
    );
  return getBudget(budgetId);
}
