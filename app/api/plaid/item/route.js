import { plaidClient } from "@/lib/plaid";
import { readPlaidItems, writePlaidItems } from "@/lib/plaid-items";

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("item_id");

    if (!itemId) {
      return Response.json({ error: "item_id is required" }, { status: 400 });
    }

    const items = await readPlaidItems();
    const item = items.find((i) => i.item_id === itemId);

    if (item) {
      try {
        await plaidClient.itemRemove({ access_token: item.access_token });
      } catch (error) {
        console.error("Error removing item from Plaid:", error.response?.data || error.message);
      }
    }

    const filtered = items.filter((i) => i.item_id !== itemId);
    await writePlaidItems(filtered);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", error.message);
    return Response.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
