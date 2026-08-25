import "server-only";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import type { AccountBase, Transaction } from "plaid";
import { ApiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import {
  accounts,
  plaidItems,
  syncRuns,
  transactions,
} from "@/lib/db/schema";
import { getErrorMessage, getPlaidErrorDetails } from "@/lib/errors";
import { plaidClient } from "@/lib/plaid";
import { collectTransactionUpdates } from "@/lib/plaid-sync-pagination";
import { decryptAccessToken } from "@/lib/security/token-encryption";

export type SyncTrigger = "link" | "manual" | "webhook";

export type SyncResult = {
  itemId: string;
  added: number;
  modified: number;
  removed: number;
};

type PlaidItem = typeof plaidItems.$inferSelect;

const activeSyncs = new Map<string, Promise<SyncResult>>();

function plaidErrorCode(error: unknown): string | null {
  const details = getPlaidErrorDetails(error);
  if (
    details &&
    typeof details === "object" &&
    "error_code" in details &&
    typeof details.error_code === "string"
  ) {
    return details.error_code;
  }
  return null;
}

function accountValues(item: PlaidItem, account: AccountBase) {
  return {
    id: account.account_id,
    itemId: item.id,
    userId: item.userId,
    name: account.name,
    officialName: account.official_name,
    mask: account.mask,
    type: String(account.type),
    subtype: account.subtype ? String(account.subtype) : null,
    currentBalance:
      account.balances.current === null
        ? null
        : account.balances.current.toFixed(2),
    availableBalance:
      account.balances.available === null
        ? null
        : account.balances.available.toFixed(2),
    isoCurrencyCode: account.balances.iso_currency_code,
    archivedAt: null,
    updatedAt: new Date(),
  };
}

function transactionValues(item: PlaidItem, transaction: Transaction) {
  return {
    id: transaction.transaction_id,
    itemId: item.id,
    accountId: transaction.account_id,
    userId: item.userId,
    institutionName: item.institutionName,
    date: transaction.date,
    authorizedDate: transaction.authorized_date,
    amount: transaction.amount.toFixed(2),
    isoCurrencyCode: transaction.iso_currency_code,
    name: transaction.name,
    merchantName: transaction.merchant_name ?? null,
    categoryPrimary: transaction.personal_finance_category?.primary ?? null,
    categoryDetailed: transaction.personal_finance_category?.detailed ?? null,
    pending: transaction.pending,
    pendingTransactionId: transaction.pending_transaction_id,
    paymentChannel: String(transaction.payment_channel),
    removedAt: null,
    updatedAt: new Date(),
  };
}

async function performItemSync(
  item: PlaidItem,
  trigger: SyncTrigger,
): Promise<SyncResult> {
  const db = getDb();
  const [run] = await db
    .insert(syncRuns)
    .values({ itemId: item.id, trigger })
    .returning({ id: syncRuns.id });
  if (!run) throw new Error("The sync run insert returned no row.");

  try {
    const accessToken = decryptAccessToken(item.accessTokenEncrypted);
    const [accountResponse, updates] = await Promise.all([
      plaidClient.accountsGet({ access_token: accessToken }),
      collectTransactionUpdates(item.cursor, async (cursor) => {
        const response = await plaidClient.transactionsSync({
          access_token: accessToken,
          ...(cursor ? { cursor } : {}),
        });
        return response.data;
      }),
    ]);

    await db.transaction(async (tx) => {
      const receivedAccountIds = accountResponse.data.accounts.map(
        (account) => account.account_id,
      );
      for (const account of accountResponse.data.accounts) {
        const values = accountValues(item, account);
        await tx
          .insert(accounts)
          .values(values)
          .onConflictDoUpdate({
            target: accounts.id,
            set: {
              name: values.name,
              officialName: values.officialName,
              mask: values.mask,
              type: values.type,
              subtype: values.subtype,
              currentBalance: values.currentBalance,
              availableBalance: values.availableBalance,
              isoCurrencyCode: values.isoCurrencyCode,
              archivedAt: null,
              updatedAt: values.updatedAt,
            },
          });
      }
      if (receivedAccountIds.length > 0) {
        await tx
          .update(accounts)
          .set({ archivedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(accounts.itemId, item.id),
              notInArray(accounts.id, receivedAccountIds),
            ),
          );
      }

      const changedTransactions = new Map<string, Transaction>();
      for (const transaction of updates.added) {
        changedTransactions.set(transaction.transaction_id, transaction);
      }
      for (const transaction of updates.modified) {
        changedTransactions.set(transaction.transaction_id, transaction);
      }
      for (const transaction of changedTransactions.values()) {
        const values = transactionValues(item, transaction);
        await tx
          .insert(transactions)
          .values(values)
          .onConflictDoUpdate({
            target: transactions.id,
            set: {
              accountId: values.accountId,
              institutionName: values.institutionName,
              date: values.date,
              authorizedDate: values.authorizedDate,
              amount: values.amount,
              isoCurrencyCode: values.isoCurrencyCode,
              name: values.name,
              merchantName: values.merchantName,
              categoryPrimary: values.categoryPrimary,
              categoryDetailed: values.categoryDetailed,
              pending: values.pending,
              pendingTransactionId: values.pendingTransactionId,
              paymentChannel: values.paymentChannel,
              removedAt: null,
              updatedAt: values.updatedAt,
            },
          });
      }

      const removedIds = updates.removed.map(
        (transaction) => transaction.transaction_id,
      );
      if (removedIds.length > 0) {
        await tx
          .update(transactions)
          .set({ removedAt: new Date(), updatedAt: new Date() })
          .where(
            and(
              eq(transactions.itemId, item.id),
              inArray(transactions.id, removedIds),
            ),
          );
      }

      const completedAt = new Date();
      await tx
        .update(plaidItems)
        .set({
          cursor: updates.nextCursor,
          status: "active",
          errorCode: null,
          errorMessage: null,
          lastSyncedAt: completedAt,
          updatedAt: completedAt,
        })
        .where(eq(plaidItems.id, item.id));
      await tx
        .update(syncRuns)
        .set({
          status: "succeeded",
          addedCount: updates.added.length,
          modifiedCount: updates.modified.length,
          removedCount: updates.removed.length,
          finishedAt: completedAt,
        })
        .where(eq(syncRuns.id, run.id));
    });

    return {
      itemId: item.id,
      added: updates.added.length,
      modified: updates.modified.length,
      removed: updates.removed.length,
    };
  } catch (error) {
    const message = getErrorMessage(error);
    await db.transaction(async (tx) => {
      await tx
        .update(plaidItems)
        .set({
          status: "error",
          errorCode: plaidErrorCode(error),
          errorMessage: message,
          updatedAt: new Date(),
        })
        .where(eq(plaidItems.id, item.id));
      await tx
        .update(syncRuns)
        .set({ status: "failed", errorMessage: message, finishedAt: new Date() })
        .where(eq(syncRuns.id, run.id));
    });
    throw error;
  }
}

export async function syncItem(
  itemId: string,
  trigger: SyncTrigger,
  userId?: string,
): Promise<SyncResult> {
  const current = activeSyncs.get(itemId);
  if (current) return current;

  const operation = (async () => {
    const [item] = await getDb()
      .select()
      .from(plaidItems)
      .where(
        userId ? and(eq(plaidItems.id, itemId), eq(plaidItems.userId, userId)) : eq(plaidItems.id, itemId),
      )
      .limit(1);
    if (!item || item.status === "disconnected") {
      throw new ApiError(404, "NOT_FOUND", "Connected Plaid Item not found.");
    }
    return performItemSync(item, trigger);
  })();

  activeSyncs.set(itemId, operation);
  try {
    return await operation;
  } finally {
    activeSyncs.delete(itemId);
  }
}

export async function syncAllItems(userId: string, trigger: SyncTrigger): Promise<{
  results: SyncResult[];
  failures: Array<{ itemId: string; message: string }>;
}> {
  const items = await getDb()
    .select({ id: plaidItems.id })
    .from(plaidItems)
    .where(
      and(
        eq(plaidItems.userId, userId),
        inArray(plaidItems.status, ["active", "error"]),
      ),
    );
  const settled = await Promise.allSettled(
    items.map((item) => syncItem(item.id, trigger, userId)),
  );
  const results: SyncResult[] = [];
  const failures: Array<{ itemId: string; message: string }> = [];
  settled.forEach((result, index) => {
    const itemId = items[index]?.id ?? "unknown";
    if (result.status === "fulfilled") {
      results.push(result.value);
    } else {
      failures.push({ itemId, message: getErrorMessage(result.reason) });
    }
  });
  return { results, failures };
}
