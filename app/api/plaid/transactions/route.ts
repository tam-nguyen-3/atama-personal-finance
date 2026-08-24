import { plaidClient } from "@/lib/plaid";
import { readPlaidItems, writePlaidItems } from "@/lib/plaid-items";
import { getErrorMessage, getPlaidErrorDetails } from "@/lib/errors";
import type { TransactionsSyncRequest } from "plaid";
import type {
  DashboardTransaction,
  PlaidStoredItem,
} from "@/types/finance";

type ItemSyncResult = {
  transactions: DashboardTransaction[];
  newCursor: string | null;
};

async function syncTransactionsForItem(
  item: PlaidStoredItem,
): Promise<ItemSyncResult> {
  const allAdded: DashboardTransaction[] = [];
  let cursor = item.cursor;
  let hasMore = true;

  while (hasMore) {
    const request: TransactionsSyncRequest = {
      access_token: item.access_token,
    };
    if (cursor) request.cursor = cursor;

    const response = await plaidClient.transactionsSync(request);
    const data = response.data;

    allAdded.push(
      ...data.added.map((transaction) => ({
        ...transaction,
        institution_name: item.institution_name,
      })),
    );
    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  return {
    transactions: allAdded,
    newCursor: cursor,
  };
}

export async function GET() {
  try {
    const items = await readPlaidItems();
    if (items.length === 0) {
      return Response.json([]);
    }

    const results = await Promise.all(
      items.map(async (item) => {
        try {
          return await syncTransactionsForItem(item);
        } catch (error) {
          console.error(
            `Error syncing transactions for ${item.institution_name}:`,
            getPlaidErrorDetails(error),
          );
          return { transactions: [], newCursor: item.cursor };
        }
      })
    );

    // Update cursors in items.json
    const updatedItems = items.map((item, index) => ({
      ...item,
      cursor: results[index]?.newCursor ?? item.cursor,
    }));
    const cursorsChanged = updatedItems.some(
      (item, index) => item.cursor !== items[index]?.cursor,
    );
    if (cursorsChanged) {
      await writePlaidItems(updatedItems);
    }

    const allTransactions = results.flatMap((r) => r.transactions);
    allTransactions.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    return Response.json(allTransactions);
  } catch (error) {
    console.error("Error fetching transactions:", getErrorMessage(error));
    return Response.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
