import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";

const plaidMocks = vi.hoisted(() => ({ itemRemove: vi.fn() }));

vi.mock("@/lib/plaid", () => ({
  plaidClient: { itemRemove: plaidMocks.itemRemove },
}));

import { getDb } from "@/lib/db";
import {
  accounts,
  budgetTransactions,
  plaidItems,
  transactions,
} from "@/lib/db/schema";
import {
  assignTransaction,
  createBudget,
  deleteBudget,
  listAccounts,
  listBudgets,
  listTransactions,
  unassignTransaction,
  updateBudget,
} from "@/lib/db/queries";
import { disconnectPlaidItem } from "@/lib/plaid-items-service";
import { seedAccount, seedItem, seedTransaction } from "./helpers";

describe("PostgreSQL data access", () => {
  it("persists the complete budget lifecycle", async () => {
    const created = await createBudget({ name: "Groceries", limit: 500 });
    expect(await listBudgets()).toEqual([created]);

    await updateBudget(created.id, { name: "Food", limit: 650 });
    expect(await listBudgets()).toMatchObject([
      { id: created.id, name: "Food", limit: 650 },
    ]);

    await deleteBudget(created.id);
    expect(await listBudgets()).toEqual([]);
  });

  it("enforces exclusive transaction assignment and supports unassignment", async () => {
    await seedItem();
    await seedAccount();
    await seedTransaction();
    const groceries = await createBudget({ name: "Groceries", limit: 500 });
    const dining = await createBudget({ name: "Dining", limit: 200 });

    const assigned = await assignTransaction(groceries.id, "transaction-1");
    expect(assigned.transactionIds).toEqual(["transaction-1"]);
    await expect(assignTransaction(dining.id, "transaction-1")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });

    const unassigned = await unassignTransaction(groceries.id, "transaction-1");
    expect(unassigned.transactionIds).toEqual([]);
  });

  it("deletes budget assignments through the database cascade", async () => {
    await seedItem();
    await seedAccount();
    await seedTransaction();
    const budget = await createBudget({ name: "Groceries", limit: 500 });
    await assignTransaction(budget.id, "transaction-1");

    await deleteBudget(budget.id);
    expect(await getDb().select().from(budgetTransactions)).toEqual([]);
  });

  it("orders, searches, paginates, and hides removed transactions", async () => {
    await seedItem();
    await seedAccount();
    await seedTransaction({
      id: "transaction-c",
      date: "2026-08-24",
      name: "Coffee Shop",
    });
    await seedTransaction({
      id: "transaction-b",
      date: "2026-08-24",
      name: "Book Shop",
    });
    await seedTransaction({
      id: "transaction-a",
      date: "2026-08-23",
      name: "Train Pass",
    });
    await seedTransaction({
      id: "transaction-removed",
      date: "2026-08-25",
      removedAt: new Date(),
    });

    const firstPage = await listTransactions({ limit: 2 });
    expect(firstPage.data.map((transaction) => transaction.transaction_id)).toEqual([
      "transaction-c",
      "transaction-b",
    ]);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondPage = await listTransactions({
      limit: 2,
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.data.map((transaction) => transaction.transaction_id)).toEqual([
      "transaction-a",
    ]);
    expect(secondPage.nextCursor).toBeNull();

    const search = await listTransactions({ limit: 10, query: "coffee" });
    expect(search.data.map((transaction) => transaction.transaction_id)).toEqual([
      "transaction-c",
    ]);
  });

  it("shows cached accounts for active and errored Items only", async () => {
    await seedItem({ id: "active-item" });
    await seedItem({ id: "error-item", status: "error" });
    await seedItem({ id: "disconnected-item", status: "disconnected" });
    await seedAccount({ id: "active-account", itemId: "active-item" });
    await seedAccount({ id: "error-account", itemId: "error-item" });
    await seedAccount({ id: "disconnected-account", itemId: "disconnected-item" });
    await seedAccount({
      id: "archived-account",
      itemId: "active-item",
      archivedAt: new Date(),
    });

    expect((await listAccounts()).map((account) => account.account_id).sort()).toEqual([
      "active-account",
      "error-account",
    ]);
  });

  it("disconnects an Item while retaining transactions and budget history", async () => {
    plaidMocks.itemRemove.mockResolvedValue({ data: {} });
    await seedItem();
    await seedAccount();
    await seedTransaction();
    const budget = await createBudget({ name: "Groceries", limit: 500 });
    await assignTransaction(budget.id, "transaction-1");

    await disconnectPlaidItem("item-1");

    expect(plaidMocks.itemRemove).toHaveBeenCalledWith({
      access_token: "access-token",
    });
    const [item] = await getDb()
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.id, "item-1"));
    const [account] = await getDb()
      .select()
      .from(accounts)
      .where(eq(accounts.id, "account-1"));
    expect(item?.status).toBe("disconnected");
    expect(account?.archivedAt).toBeInstanceOf(Date);
    expect(await getDb().select().from(transactions)).toHaveLength(1);
    expect((await listBudgets())[0]?.transactionIds).toEqual(["transaction-1"]);
  });
});
