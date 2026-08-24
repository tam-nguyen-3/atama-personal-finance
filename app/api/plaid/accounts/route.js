import { plaidClient } from "@/lib/plaid";
import { readPlaidItems } from "@/lib/plaid-items";

export async function GET() {
  try {
    const items = await readPlaidItems();
    if (items.length === 0) {
      return Response.json([]);
    }

    const results = await Promise.all(
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
          console.error(`Error fetching accounts for ${item.institution_name}:`, error.response?.data || error.message);
          return [];
        }
      })
    );

    return Response.json(results.flat());
  } catch (error) {
    console.error("Error fetching accounts:", error.message);
    return Response.json({ error: "Failed to fetch accounts" }, { status: 500 });
  }
}
