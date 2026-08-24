import { z } from "zod";
import { ApiError } from "./api";

const cursorSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  id: z.string().min(1),
});

export type TransactionCursor = z.infer<typeof cursorSchema>;

export function encodeTransactionCursor(cursor: TransactionCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function decodeTransactionCursor(value: string): TransactionCursor {
  try {
    return cursorSchema.parse(
      JSON.parse(Buffer.from(value, "base64url").toString("utf8")),
    );
  } catch {
    throw new ApiError(400, "BAD_REQUEST", "The transaction cursor is invalid.");
  }
}
