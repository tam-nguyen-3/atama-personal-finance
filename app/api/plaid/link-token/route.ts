import { apiError, ApiError } from "@/lib/api";
import { isPlaidConfigured, plaidClient } from "@/lib/plaid";
import { CountryCode, Products } from "plaid";
import { LOCAL_USER_ID } from "@/lib/db/schema";

export async function POST() {
  try {
    if (!isPlaidConfigured) {
      throw new ApiError(
        503,
        "NOT_CONFIGURED",
        "Plaid Sandbox credentials are not configured.",
      );
    }

    const webhook = process.env.PLAID_WEBHOOK_URL?.trim();
    const response = await plaidClient.linkTokenCreate({
      user: { client_user_id: LOCAL_USER_ID },
      client_name: "atama",
      products: [Products.Transactions],
      country_codes: [CountryCode.Us],
      language: "en",
      ...(webhook ? { webhook } : {}),
    });
    return Response.json({ link_token: response.data.link_token });
  } catch (error) {
    return apiError(error);
  }
}
