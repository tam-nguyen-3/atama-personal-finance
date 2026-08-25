import { apiError, ApiError, readJson } from "@/lib/api";
import { isPlaidConfigured, plaidClient } from "@/lib/plaid";
import { storePlaidItem } from "@/lib/plaid-items-service";
import { syncItem } from "@/lib/plaid-sync";
import { exchangeTokenSchema } from "@/lib/validation";
import { requireUserId } from "@/lib/auth";
import { and, count, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { plaidItems } from "@/lib/db/schema";

export async function POST(request: Request) {
  try {
    if (!isPlaidConfigured) {
      throw new ApiError(
        503,
        "NOT_CONFIGURED",
        "Plaid Sandbox credentials are not configured.",
      );
    }
    const userId = await requireUserId(request);
    const [{ value: activeItems = 0 } = {}] = await getDb().select({ value: count() }).from(plaidItems).where(and(eq(plaidItems.userId, userId), inArray(plaidItems.status, ["active", "error"])));
    if (activeItems >= 3) throw new ApiError(409, "CONFLICT", "You can connect up to three Sandbox institutions.");
    const input = exchangeTokenSchema.parse(await readJson(request));

    const response = await plaidClient.itemPublicTokenExchange({
      public_token: input.public_token,
    });
    const { access_token, item_id } = response.data;
    await storePlaidItem({
      userId,
      itemId: item_id,
      accessToken: access_token,
      institutionId: input.institution_id,
      institutionName: input.institution_name,
    });
    const sync = await syncItem(item_id, "link", userId);
    return Response.json({ itemId: item_id, sync }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
