import { apiError } from "@/lib/api";
import { syncAllItems } from "@/lib/plaid-sync";
import { requireUserId } from "@/lib/auth";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";
import { ApiError } from "@/lib/api";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId(request);
    const items = await getDb().select({ lastSyncedAt: plaidItems.lastSyncedAt }).from(plaidItems).where(and(eq(plaidItems.userId, userId), inArray(plaidItems.status, ["active", "error"])));
    if (items.some((item) => item.lastSyncedAt && Date.now() - item.lastSyncedAt.getTime() < 60_000)) {
      throw new ApiError(429, "TOO_MANY_REQUESTS", "Please wait a minute before refreshing again.");
    }
    const result = await syncAllItems(userId, "manual");
    return Response.json(result, {
      status: result.failures.length > 0 ? 207 : 200,
    });
  } catch (error) {
    return apiError(error);
  }
}
