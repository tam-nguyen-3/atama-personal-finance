import { plaidClient } from "@/lib/plaid";
import fs from "fs/promises";
import path from "path";

const ITEMS_PATH = path.join(process.cwd(), "data", "items.json");

async function readItems() {
  try {
    const data = await fs.readFile(ITEMS_PATH, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function GET() {
  try {
    const items = await readItems();
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
