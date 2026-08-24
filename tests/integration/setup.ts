import { afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "@/lib/db";

beforeEach(async () => {
  await getDb().execute(sql`
    TRUNCATE TABLE
      budget_transactions,
      budgets,
      plaid_webhooks,
      sync_runs,
      transactions,
      accounts,
      plaid_items
    RESTART IDENTITY CASCADE
  `);
});

afterAll(async () => {
  await closeDb();
});
