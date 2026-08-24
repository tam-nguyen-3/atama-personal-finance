import fs from "fs/promises";
import path from "path";
import { getErrorMessage } from "@/lib/errors";
import type { PlaidStoredItem } from "@/types/finance";

const ITEMS_PATH = path.join(process.cwd(), "data", "items.json");

function isPlaidStoredItem(value: unknown): value is PlaidStoredItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PlaidStoredItem>;
  return (
    typeof item.access_token === "string" &&
    typeof item.item_id === "string" &&
    typeof item.institution_name === "string" &&
    (typeof item.cursor === "string" || item.cursor === null)
  );
}

export async function readPlaidItems(): Promise<PlaidStoredItem[]> {
  try {
    const data = await fs.readFile(ITEMS_PATH, "utf-8");
    const items: unknown = JSON.parse(data);
    return Array.isArray(items) ? items.filter(isPlaidStoredItem) : [];
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "ENOENT"
    ) {
      console.error("Unable to read Plaid items:", getErrorMessage(error));
    }
    return [];
  }
}

export async function writePlaidItems(
  items: PlaidStoredItem[],
): Promise<void> {
  await fs.mkdir(path.dirname(ITEMS_PATH), { recursive: true });
  await fs.writeFile(ITEMS_PATH, JSON.stringify(items, null, 2), {
    mode: 0o600,
  });
}
