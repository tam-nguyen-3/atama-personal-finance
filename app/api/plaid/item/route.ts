import { plaidClient } from "@/lib/plaid";
import { readPlaidItems, writePlaidItems } from "@/lib/plaid-items";
import { getErrorMessage, getPlaidErrorDetails } from "@/lib/errors";

export async function DELETE(request: Request) {
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
        console.error(
          "Error removing item from Plaid:",
          getPlaidErrorDetails(error),
        );
      }
    }

    const filtered = items.filter((i) => i.item_id !== itemId);
    await writePlaidItems(filtered);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Error deleting item:", getErrorMessage(error));
    return Response.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
