import fs from "fs/promises";
import path from "path";

const ITEMS_PATH = path.join(process.cwd(), "data", "items.json");

export async function readPlaidItems() {
  try {
    const data = await fs.readFile(ITEMS_PATH, "utf-8");
    const items = JSON.parse(data);
    return Array.isArray(items) ? items : [];
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Unable to read Plaid items:", error.message);
    }
    return [];
  }
}

export async function writePlaidItems(items) {
  await fs.mkdir(path.dirname(ITEMS_PATH), { recursive: true });
  await fs.writeFile(ITEMS_PATH, JSON.stringify(items, null, 2), {
    mode: 0o600,
  });
}
