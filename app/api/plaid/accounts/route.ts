import { plaidClient } from "@/lib/plaid";
import { readPlaidItems } from "@/lib/plaid-items";
import { getErrorMessage, getPlaidErrorDetails } from "@/lib/errors";
import type { DashboardAccount } from "@/types/finance";

export async function GET() {
  try {
    const items = await readPlaidItems();
    if (items.length === 0) {
      return Response.json([]);
    }

    const results: DashboardAccount[][] = await Promise.all(
      items.map(async (item) => {
        try {
          const response = await plaidClient.accountsGet({
            access_token: item.access_token,
          });
          return response.data.accounts.map((account) => ({
            ...account,
            institution_name: item.institution_name,
            item_id: item.item_id,
          }));
        } catch (error) {
          console.error(
            `Error fetching accounts for ${item.institution_name}:`,
            getPlaidErrorDetails(error),
          );
          return [];
        }
      })
    );

    return Response.json(results.flat());
  } catch (error) {
    console.error("Error fetching accounts:", getErrorMessage(error));
    return Response.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
