import { beforeEach, describe, expect, it, vi } from "vitest";
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
  users,
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
import { seedAccount, seedItem, seedTransaction, TEST_USER_ID } from "./helpers";

describe("PostgreSQL data access", () => {
  beforeEach(() => {
    plaidMocks.itemRemove.mockReset();
  });

  it("persists the complete budget lifecycle", async () => {
    const created = await createBudget(TEST_USER_ID, { name: "Groceries", limit: 500 });
    expect(await listBudgets(TEST_USER_ID)).toEqual([created]);

    await updateBudget(TEST_USER_ID, created.id, { name: "Food", limit: 650 });
    expect(await listBudgets(TEST_USER_ID)).toMatchObject([
      { id: created.id, name: "Food", limit: 650 },
    ]);

    await deleteBudget(TEST_USER_ID, created.id);
    expect(await listBudgets(TEST_USER_ID)).toEqual([]);
  });

  it("enforces exclusive transaction assignment and supports unassignment", async () => {
    await seedItem();
    await seedAccount();
    await seedTransaction();
    const groceries = await createBudget(TEST_USER_ID, { name: "Groceries", limit: 500 });
    const dining = await createBudget(TEST_USER_ID, { name: "Dining", limit: 200 });

    const assigned = await assignTransaction(TEST_USER_ID, groceries.id, "transaction-1");
    expect(assigned.transactionIds).toEqual(["transaction-1"]);
    await expect(assignTransaction(TEST_USER_ID, dining.id, "transaction-1")).rejects.toMatchObject({
      status: 409,
      code: "CONFLICT",
    });

    const unassigned = await unassignTransaction(TEST_USER_ID, groceries.id, "transaction-1");
    expect(unassigned.transactionIds).toEqual([]);
  });

  it("deletes budget assignments through the database cascade", async () => {
    await seedItem();
    await seedAccount();
    await seedTransaction();
    const budget = await createBudget(TEST_USER_ID, { name: "Groceries", limit: 500 });
    await assignTransaction(TEST_USER_ID, budget.id, "transaction-1");

    await deleteBudget(TEST_USER_ID, budget.id);
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

    const firstPage = await listTransactions(TEST_USER_ID, { limit: 2 });
    expect(firstPage.data.map((transaction) => transaction.transaction_id)).toEqual([
      "transaction-c",
      "transaction-b",
    ]);
    expect(firstPage.nextCursor).toEqual(expect.any(String));

    const secondPage = await listTransactions(TEST_USER_ID, {
      limit: 2,
      cursor: firstPage.nextCursor!,
    });
    expect(secondPage.data.map((transaction) => transaction.transaction_id)).toEqual([
      "transaction-a",
    ]);
    expect(secondPage.nextCursor).toBeNull();

    const search = await listTransactions(TEST_USER_ID, { limit: 10, query: "coffee" });
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

    expect((await listAccounts(TEST_USER_ID)).map((account) => account.account_id).sort()).toEqual([
      "active-account",
      "error-account",
    ]);
  });

  it("disconnects an Item while retaining transactions and budget history", async () => {
    plaidMocks.itemRemove.mockResolvedValue({ data: {} });
    await seedItem();
    await seedAccount();
    await seedTransaction();
    const budget = await createBudget(TEST_USER_ID, { name: "Groceries", limit: 500 });
    await assignTransaction(TEST_USER_ID, budget.id, "transaction-1");

    await disconnectPlaidItem(TEST_USER_ID, "item-1");

    expect(plaidMocks.itemRemove).toHaveBeenCalledWith({
      access_token: "access-token",
      reason_code: "OTHER",
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
    expect(await listAccounts(TEST_USER_ID)).toEqual([]);
    expect((await listTransactions(TEST_USER_ID, { limit: 10 })).data).toEqual([]);
    expect((await listBudgets(TEST_USER_ID))[0]?.transactionIds).toEqual([]);
    expect(await getDb().select().from(budgetTransactions)).toHaveLength(1);
  });

  it("keeps an Item connected when Plaid removal fails", async () => {
    plaidMocks.itemRemove.mockRejectedValue({
      response: { data: { error_code: "INTERNAL_SERVER_ERROR" } },
    });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    await seedItem();
    await seedAccount();

    await expect(
      disconnectPlaidItem(TEST_USER_ID, "item-1"),
    ).rejects.toMatchObject({ status: 502, code: "PLAID_ERROR" });

    const [item] = await getDb().select().from(plaidItems);
    const [account] = await getDb().select().from(accounts);
    expect(item?.status).toBe("active");
    expect(account?.archivedAt).toBeNull();
    consoleError.mockRestore();
  });

  it("reconciles an Item Plaid already removed and allows repeat disconnects", async () => {
    plaidMocks.itemRemove.mockRejectedValueOnce({
      response: { data: { error_code: "ITEM_NOT_FOUND" } },
    });
    await seedItem();
    await seedAccount();

    await disconnectPlaidItem(TEST_USER_ID, "item-1");
    await disconnectPlaidItem(TEST_USER_ID, "item-1");

    expect(plaidMocks.itemRemove).toHaveBeenCalledTimes(1);
    const [item] = await getDb().select().from(plaidItems);
    expect(item?.status).toBe("disconnected");
  });

  it("does not disconnect another user's Item", async () => {
    const otherUserId = "00000000-0000-4000-8000-000000000002";
    await getDb().insert(users).values({
      id: otherUserId,
      displayName: "Other User",
      email: "other@example.com",
    });
    await seedItem();

    await expect(
      disconnectPlaidItem(otherUserId, "item-1"),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
    expect(plaidMocks.itemRemove).not.toHaveBeenCalled();
  });

  it("rejects budget assignment for a disconnected Item's transaction", async () => {
    await seedItem({ status: "disconnected" });
    await seedAccount({ archivedAt: new Date() });
    await seedTransaction();
    const budget = await createBudget(TEST_USER_ID, {
      name: "Groceries",
      limit: 500,
    });

    await expect(
      assignTransaction(TEST_USER_ID, budget.id, "transaction-1"),
    ).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });
});
