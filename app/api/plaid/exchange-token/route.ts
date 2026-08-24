import { isPlaidConfigured, plaidClient } from "@/lib/plaid";
import { readPlaidItems, writePlaidItems } from "@/lib/plaid-items";
import { getPlaidErrorDetails } from "@/lib/errors";

type ExchangeTokenBody = {
  public_token?: string;
  institution_name?: string;
};

export async function POST(request: Request) {
  try {
    const { public_token, institution_name } =
      (await request.json()) as ExchangeTokenBody;

    if (!isPlaidConfigured) {
      return Response.json(
        { error: "Plaid Sandbox credentials are not configured." },
        { status: 503 },
      );
    }
    if (!public_token) {
      return Response.json(
        { error: "A Plaid public token is required." },
        { status: 400 },
      );
    }

    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = response.data;

    const items = await readPlaidItems();
    items.push({
      access_token,
      item_id,
      institution_name: institution_name || "Unknown Bank",
      cursor: null,
    });
    await writePlaidItems(items);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error exchanging token:", getPlaidErrorDetails(error));
    return Response.json(
      { error: "Failed to exchange token" },
      { status: 500 }
    );
  }
}
