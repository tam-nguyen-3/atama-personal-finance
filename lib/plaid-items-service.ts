import "server-only";

import { and, eq } from "drizzle-orm";
import { ItemRemoveReasonCode } from "plaid";
import { ApiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { accounts, plaidItems } from "@/lib/db/schema";
import { getPlaidErrorDetails } from "@/lib/errors";
import { plaidClient } from "@/lib/plaid";
import {
  decryptAccessToken,
  encryptAccessToken,
} from "@/lib/security/token-encryption";

function plaidDetail(details: unknown, key: string): string | null {
  if (!details || typeof details !== "object" || !(key in details)) return null;
  const value = (details as Record<string, unknown>)[key];
  return typeof value === "string" ? value : null;
}

export async function storePlaidItem(input: {
  userId: string;
  itemId: string;
  accessToken: string;
  institutionId?: string | null;
  institutionName: string;
}): Promise<void> {
  const encryptedToken = encryptAccessToken(input.accessToken);
  const [existing] = await getDb()
    .select({ userId: plaidItems.userId })
    .from(plaidItems)
    .where(eq(plaidItems.id, input.itemId))
    .limit(1);
  if (existing && existing.userId !== input.userId) {
    throw new ApiError(404, "NOT_FOUND", "Connected Plaid Item not found.");
  }
  await getDb()
    .insert(plaidItems)
    .values({
      id: input.itemId,
      userId: input.userId,
      institutionId: input.institutionId ?? null,
      institutionName: input.institutionName,
      accessTokenEncrypted: encryptedToken,
    })
    .onConflictDoUpdate({
      target: plaidItems.id,
      set: {
        institutionId: input.institutionId ?? null,
        institutionName: input.institutionName,
        accessTokenEncrypted: encryptedToken,
        cursor: null,
        status: "active",
        errorCode: null,
        errorMessage: null,
        disconnectedAt: null,
        updatedAt: new Date(),
      },
    });
}

export async function disconnectPlaidItem(userId: string, itemId: string): Promise<void> {
  const db = getDb();
  const [item] = await db
    .select()
    .from(plaidItems)
    .where(
      and(eq(plaidItems.id, itemId), eq(plaidItems.userId, userId)),
    )
    .limit(1);
  if (!item) {
    throw new ApiError(404, "NOT_FOUND", "Connected Plaid Item not found.");
  }
  if (item.status === "disconnected") return;

  try {
    await plaidClient.itemRemove({
      access_token: decryptAccessToken(item.accessTokenEncrypted),
      reason_code: ItemRemoveReasonCode.Other,
    });
  } catch (error) {
    const details = getPlaidErrorDetails(error);
    const errorCode = plaidDetail(details, "error_code");
    if (errorCode !== "ITEM_NOT_FOUND") {
      console.error("Plaid Item removal failed:", {
        errorCode,
        errorType: plaidDetail(details, "error_type"),
        requestId: plaidDetail(details, "request_id"),
      });
      throw new ApiError(
        502,
        "PLAID_ERROR",
        "Plaid could not disconnect this bank. Try again.",
      );
    }
  }

  const disconnectedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(plaidItems)
      .set({
        status: "disconnected",
        errorCode: null,
        errorMessage: null,
        disconnectedAt,
        updatedAt: disconnectedAt,
      })
      .where(and(eq(plaidItems.id, itemId), eq(plaidItems.userId, userId)));
    await tx
      .update(accounts)
      .set({ archivedAt: disconnectedAt, updatedAt: disconnectedAt })
      .where(and(eq(accounts.itemId, itemId), eq(accounts.userId, userId)));
  });
}
