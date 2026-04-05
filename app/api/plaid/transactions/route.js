import { plaidClient } from "@/lib/plaid";
import fs from "fs/promises";
import path from "path";

const ITEMS_PATH = path.join(process.cwd(), "data", "items.json");

async function readItems() {
  try {
    const data = await fs.readFile(ITEMS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

async function writeItems(items) {
  await fs.writeFile(ITEMS_PATH, JSON.stringify(items, null, 2));
}

async function syncTransactionsForItem(item) {
  const allAdded = [];
  let cursor = item.cursor;
  let hasMore = true;

  while (hasMore) {
    const request = { access_token: item.access_token };
    if (cursor) request.cursor = cursor;

    const response = await plaidClient.transactionsSync(request);
    const data = response.data;

    allAdded.push(...data.added);
    cursor = data.next_cursor;
    hasMore = data.has_more;
  }

  return {
    transactions: allAdded.map((txn) => ({
      ...txn,
      institution_name: item.institution_name,
    })),
    newCursor: cursor,
  };
}

export async function GET() {
  try {
    const items = await readItems();
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
            error.response?.data || error.message
          );
          return { transactions: [], newCursor: item.cursor };
        }
      })
    );

    // Update cursors in items.json
    let cursorsChanged = false;
    for (let i = 0; i < items.length; i++) {
      if (results[i].newCursor !== items[i].cursor) {
        items[i].cursor = results[i].newCursor;
        cursorsChanged = true;
      }
    }
    if (cursorsChanged) {
      await writeItems(items);
    }

    const allTransactions = results.flatMap((r) => r.transactions);
    allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

    return Response.json(allTransactions);
  } catch (error) {
    console.error("Error fetching transactions:", error.message);
    return Response.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}
