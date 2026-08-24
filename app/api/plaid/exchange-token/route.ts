import { apiError, ApiError, readJson } from "@/lib/api";
import { isPlaidConfigured, plaidClient } from "@/lib/plaid";
import { storePlaidItem } from "@/lib/plaid-items-service";
import { syncItem } from "@/lib/plaid-sync";
import { exchangeTokenSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    if (!isPlaidConfigured) {
      throw new ApiError(
        503,
        "NOT_CONFIGURED",
        "Plaid Sandbox credentials are not configured.",
      );
    }
    const input = exchangeTokenSchema.parse(await readJson(request));

    const response = await plaidClient.itemPublicTokenExchange({
      public_token: input.public_token,
    });
    const { access_token, item_id } = response.data;
    await storePlaidItem({
      itemId: item_id,
      accessToken: access_token,
      institutionId: input.institution_id,
      institutionName: input.institution_name,
    });
    const sync = await syncItem(item_id, "link");
    return Response.json({ itemId: item_id, sync }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
