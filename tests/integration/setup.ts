import { afterAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { closeDb, getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { TEST_USER_ID } from "./helpers";

beforeEach(async () => {
  await getDb().execute(sql`
    TRUNCATE TABLE
      budget_transactions,
      budgets,
      plaid_webhooks,
      sync_runs,
      transactions,
      accounts,
      plaid_items,
      auth_accounts,
      auth_sessions,
      auth_verifications,
      auth_rate_limits,
      users
    RESTART IDENTITY CASCADE
  `);
  await getDb().insert(users).values({
    id: TEST_USER_ID,
    displayName: "Test User",
    email: "test@example.com",
  });
});

afterAll(async () => {
  await closeDb();
});
