import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import {
  AccountSubtype,
  AccountType,
  TransactionPaymentChannelEnum,
  type AccountBase,
  type Transaction,
  type TransactionsSyncResponse,
} from "plaid";

const plaidMocks = vi.hoisted(() => ({
  accountsGet: vi.fn(),
  transactionsSync: vi.fn(),
}));

vi.mock("@/lib/plaid", () => ({
  plaidClient: {
    accountsGet: plaidMocks.accountsGet,
    transactionsSync: plaidMocks.transactionsSync,
  },
}));

import { getDb } from "@/lib/db";
import {
  accounts,
  plaidItems,
  syncRuns,
  transactions,
} from "@/lib/db/schema";
import { syncItem } from "@/lib/plaid-sync";
import { seedAccount, seedItem, seedTransaction } from "./helpers";

function plaidAccount(id = "account-1"): AccountBase {
  return {
    account_id: id,
    balances: {
      available: 875,
      current: 925,
      limit: null,
      iso_currency_code: "USD",
      unofficial_currency_code: null,
    },
    mask: "1234",
    name: "Plaid Checking",
    official_name: "Plaid Gold Checking",
    type: AccountType.Depository,
    subtype: AccountSubtype.Checking,
  };
}

function plaidTransaction(
  id: string,
  overrides: Partial<Transaction> = {},
): Transaction {
  return {
    transaction_id: id,
    account_id: "account-1",
    amount: 25,
    iso_currency_code: "USD",
    unofficial_currency_code: null,
    date: "2026-08-24",
    name: "Corner Market",
    merchant_name: "Corner Market",
    pending: false,
    pending_transaction_id: null,
    authorized_date: "2026-08-23",
    payment_channel: TransactionPaymentChannelEnum.InStore,
    personal_finance_category: {
      primary: "FOOD_AND_DRINK",
      detailed: "FOOD_AND_DRINK_GROCERIES",
      confidence_level: null,
    },
    ...overrides,
  } as Transaction;
}

function syncResponse(
  values: Partial<TransactionsSyncResponse>,
): TransactionsSyncResponse {
  return {
    accounts: [],
    added: [],
    modified: [],
    removed: [],
    next_cursor: "next-cursor",
    has_more: false,
    request_id: "request-id",
    transactions_update_status: "HISTORICAL_UPDATE_COMPLETE",
    ...values,
  } as TransactionsSyncResponse;
}

beforeEach(() => {
  plaidMocks.accountsGet.mockReset();
  plaidMocks.transactionsSync.mockReset();
});

describe("persistent Plaid synchronization", () => {
  it("commits account, transaction, cursor, and audit updates together", async () => {
    await seedItem({ cursor: "starting-cursor" });
    await seedAccount();
    await seedTransaction({
      id: "modified-transaction",
      amount: "10.00",
      name: "Old name",
    });
    await seedTransaction({ id: "removed-transaction" });
    plaidMocks.accountsGet.mockResolvedValue({
      data: { accounts: [plaidAccount()] },
    });
    plaidMocks.transactionsSync.mockResolvedValue({
      data: syncResponse({
        added: [plaidTransaction("added-transaction")],
        modified: [
          plaidTransaction("modified-transaction", {
            amount: 42,
            name: "Updated name",
          }),
        ],
        removed: [
          { transaction_id: "removed-transaction", account_id: "account-1" },
        ],
      }),
    });

    await expect(syncItem("item-1", "manual")).resolves.toEqual({
      itemId: "item-1",
      added: 1,
      modified: 1,
      removed: 1,
    });
    expect(plaidMocks.transactionsSync).toHaveBeenCalledWith({
      access_token: "access-token",
      cursor: "starting-cursor",
    });

    const [item] = await getDb()
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.id, "item-1"));
    const transactionRows = await getDb().select().from(transactions);
    const byId = new Map(transactionRows.map((row) => [row.id, row]));
    const [account] = await getDb().select().from(accounts);
    const [run] = await getDb().select().from(syncRuns);

    expect(item).toMatchObject({ cursor: "next-cursor", status: "active" });
    expect(account?.currentBalance).toBe("925.00");
    expect(byId.get("added-transaction")?.amount).toBe("25.00");
    expect(byId.get("modified-transaction")).toMatchObject({
      amount: "42.00",
      name: "Updated name",
      removedAt: null,
    });
    expect(byId.get("removed-transaction")?.removedAt).toBeInstanceOf(Date);
    expect(run).toMatchObject({
      status: "succeeded",
      addedCount: 1,
      modifiedCount: 1,
      removedCount: 1,
    });
  });

  it("rolls back data and cursor changes when persistence fails", async () => {
    await seedItem({ cursor: "stable-cursor" });
    plaidMocks.accountsGet.mockResolvedValue({
      data: { accounts: [plaidAccount()] },
    });
    plaidMocks.transactionsSync.mockResolvedValue({
      data: syncResponse({
        added: [
          plaidTransaction("invalid-transaction", {
            account_id: "missing-account",
          }),
        ],
      }),
    });

    await expect(syncItem("item-1", "manual")).rejects.toThrow();

    const [item] = await getDb()
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.id, "item-1"));
    const [run] = await getDb().select().from(syncRuns);
    expect(item).toMatchObject({ cursor: "stable-cursor", status: "error" });
    expect(await getDb().select().from(accounts)).toEqual([]);
    expect(await getDb().select().from(transactions)).toEqual([]);
    expect(run?.status).toBe("failed");
  });
});
