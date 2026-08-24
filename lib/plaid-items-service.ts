import "server-only";

import { and, eq } from "drizzle-orm";
import { ApiError } from "@/lib/api";
import { getDb } from "@/lib/db";
import { accounts, LOCAL_USER_ID, plaidItems } from "@/lib/db/schema";
import { getPlaidErrorDetails } from "@/lib/errors";
import { plaidClient } from "@/lib/plaid";
import {
  decryptAccessToken,
  encryptAccessToken,
} from "@/lib/security/token-encryption";

export async function storePlaidItem(input: {
  itemId: string;
  accessToken: string;
  institutionId?: string | null;
  institutionName: string;
}): Promise<void> {
  const encryptedToken = encryptAccessToken(input.accessToken);
  await getDb()
    .insert(plaidItems)
    .values({
      id: input.itemId,
      userId: LOCAL_USER_ID,
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

export async function disconnectPlaidItem(itemId: string): Promise<void> {
  const db = getDb();
  const [item] = await db
    .select()
    .from(plaidItems)
    .where(
      and(eq(plaidItems.id, itemId), eq(plaidItems.userId, LOCAL_USER_ID)),
    )
    .limit(1);
  if (!item || item.status === "disconnected") {
    throw new ApiError(404, "NOT_FOUND", "Connected Plaid Item not found.");
  }

  try {
    await plaidClient.itemRemove({
      access_token: decryptAccessToken(item.accessTokenEncrypted),
    });
  } catch (error) {
    console.error("Plaid Item removal failed; disconnecting locally:", getPlaidErrorDetails(error));
  }

  const disconnectedAt = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(plaidItems)
      .set({
        status: "disconnected",
        disconnectedAt,
        updatedAt: disconnectedAt,
      })
      .where(eq(plaidItems.id, itemId));
    await tx
      .update(accounts)
      .set({ archivedAt: disconnectedAt, updatedAt: disconnectedAt })
      .where(eq(accounts.itemId, itemId));
  });
}
