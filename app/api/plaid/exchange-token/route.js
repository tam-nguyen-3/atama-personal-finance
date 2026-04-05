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

async function writeItems(items) {
  await fs.writeFile(ITEMS_PATH, JSON.stringify(items, null, 2));
}

export async function POST(request) {
  try {
    const { public_token, institution_name } = await request.json();

    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const { access_token, item_id } = response.data;

    const items = await readItems();
    items.push({
      access_token,
      item_id,
      institution_name,
      cursor: null,
    });
    await writeItems(items);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error exchanging token:", error.response?.data || error.message);
    return Response.json(
      { error: "Failed to exchange token" },
      { status: 500 }
    );
  }
}
