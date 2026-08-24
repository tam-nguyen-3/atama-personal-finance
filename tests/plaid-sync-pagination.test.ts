import { describe, expect, it, vi } from "vitest";
import type { Transaction, TransactionsSyncResponse } from "plaid";
import { collectTransactionUpdates } from "@/lib/plaid-sync-pagination";

function transaction(id: string): Transaction {
  return { transaction_id: id } as Transaction;
}

function page(
  values: Partial<TransactionsSyncResponse>,
): TransactionsSyncResponse {
  return {
    accounts: [],
    added: [],
    modified: [],
    removed: [],
    next_cursor: "cursor",
    has_more: false,
    request_id: "request",
    transactions_update_status: "HISTORICAL_UPDATE_COMPLETE",
    ...values,
  } as TransactionsSyncResponse;
}

describe("Plaid transaction pagination", () => {
  it("collects added, modified, and removed updates across every page", async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(
        page({ added: [transaction("added")], next_cursor: "page-2", has_more: true }),
      )
      .mockResolvedValueOnce(
        page({
          modified: [transaction("modified")],
          removed: [{ transaction_id: "removed", account_id: "account" }],
          next_cursor: "done",
        }),
      );

    const result = await collectTransactionUpdates("start", fetchPage);
    expect(fetchPage).toHaveBeenNthCalledWith(1, "start");
    expect(fetchPage).toHaveBeenNthCalledWith(2, "page-2");
    expect(result.added.map((value) => value.transaction_id)).toEqual(["added"]);
    expect(result.modified.map((value) => value.transaction_id)).toEqual([
      "modified",
    ]);
    expect(result.removed.map((value) => value.transaction_id)).toEqual([
      "removed",
    ]);
    expect(result.nextCursor).toBe("done");
  });

  it("restarts from the original cursor after a pagination mutation", async () => {
    const mutationError = {
      response: {
        data: {
          error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION",
        },
      },
    };
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page({ next_cursor: "stale", has_more: true }))
      .mockRejectedValueOnce(mutationError)
      .mockResolvedValueOnce(page({ next_cursor: "fresh" }));

    await expect(collectTransactionUpdates("original", fetchPage)).resolves.toMatchObject({
      nextCursor: "fresh",
    });
    expect(fetchPage.mock.calls.map(([cursor]) => cursor)).toEqual([
      "original",
      "stale",
      "original",
    ]);
  });
});
