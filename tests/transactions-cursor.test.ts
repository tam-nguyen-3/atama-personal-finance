import { describe, expect, it } from "vitest";
import {
  decodeTransactionCursor,
  encodeTransactionCursor,
} from "@/lib/transactions-cursor";

describe("transaction cursors", () => {
  it("round trips an opaque date and id cursor", () => {
    const cursor = { date: "2026-08-24", id: "transaction-123" };
    expect(decodeTransactionCursor(encodeTransactionCursor(cursor))).toEqual(
      cursor,
    );
  });

  it("rejects malformed cursors", () => {
    expect(() => decodeTransactionCursor("not-a-cursor")).toThrow(
      "transaction cursor is invalid",
    );
  });
});
