import type {
  RemovedTransaction,
  Transaction,
  TransactionsSyncResponse,
} from "plaid";

export type PlaidSyncUpdates = {
  added: Transaction[];
  modified: Transaction[];
  removed: RemovedTransaction[];
  nextCursor: string;
};

type FetchPage = (cursor?: string) => Promise<TransactionsSyncResponse>;

function isMutationDuringPagination(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("response" in error)) {
    return false;
  }
  const response = error.response;
  if (!response || typeof response !== "object" || !("data" in response)) {
    return false;
  }
  const data = response.data;
  return (
    data !== null &&
    typeof data === "object" &&
    "error_code" in data &&
    data.error_code === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION"
  );
}

export async function collectTransactionUpdates(
  initialCursor: string | null,
  fetchPage: FetchPage,
  maximumAttempts = 3,
): Promise<PlaidSyncUpdates> {
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const added: Transaction[] = [];
    const modified: Transaction[] = [];
    const removed: RemovedTransaction[] = [];
    let cursor = initialCursor ?? undefined;

    try {
      while (true) {
        const page = await fetchPage(cursor);
        added.push(...page.added);
        modified.push(...page.modified);
        removed.push(...page.removed);
        cursor = page.next_cursor;
        if (!page.has_more) {
          return { added, modified, removed, nextCursor: page.next_cursor };
        }
      }
    } catch (error) {
      if (!isMutationDuringPagination(error) || attempt === maximumAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Transaction synchronization exhausted all attempts.");
}
