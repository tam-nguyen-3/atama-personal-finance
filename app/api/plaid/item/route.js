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

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("item_id");

    if (!itemId) {
      return Response.json({ error: "item_id is required" }, { status: 400 });
    }

    const items = await readItems();
    const item = items.find((i) => i.item_id === itemId);

    if (item) {
      try {
        await plaidClient.itemRemove({ access_token: item.access_token });
      } catch (error) {
        console.error("Error removing item from Plaid:", error.response?.data || error.message);
      }
    }

    const filtered = items.filter((i) => i.item_id !== itemId);
    await writeItems(filtered);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error.message);
    return Response.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
