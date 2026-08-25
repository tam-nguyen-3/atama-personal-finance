import { getDb } from "@/lib/db";
import {
  accounts,
  plaidItems,
  transactions,
} from "@/lib/db/schema";
import { encryptAccessToken } from "@/lib/security/token-encryption";

export const TEST_USER_ID = "00000000-0000-4000-8000-000000000001";

type NewItem = typeof plaidItems.$inferInsert;
type NewAccount = typeof accounts.$inferInsert;
type NewTransaction = typeof transactions.$inferInsert;

export async function seedItem(overrides: Partial<NewItem> = {}) {
  const values: NewItem = {
    id: "item-1",
    userId: TEST_USER_ID,
    institutionName: "Tartan Bank",
    accessTokenEncrypted: encryptAccessToken("access-token"),
    ...overrides,
  };
  await getDb().insert(plaidItems).values(values);
  return values;
}

export async function seedAccount(overrides: Partial<NewAccount> = {}) {
  const values: NewAccount = {
    id: "account-1",
    itemId: "item-1",
    userId: TEST_USER_ID,
    name: "Checking",
    type: "depository",
    subtype: "checking",
    currentBalance: "1000.00",
    availableBalance: "900.00",
    isoCurrencyCode: "USD",
    ...overrides,
  };
  await getDb().insert(accounts).values(values);
  return values;
}

export async function seedTransaction(
  overrides: Partial<NewTransaction> = {},
) {
  const values: NewTransaction = {
    id: "transaction-1",
    itemId: "item-1",
    accountId: "account-1",
    userId: TEST_USER_ID,
    institutionName: "Tartan Bank",
    date: "2026-08-24",
    amount: "25.00",
    name: "Corner Market",
    merchantName: "Corner Market",
    pending: false,
    paymentChannel: "in store",
    ...overrides,
  };
  await getDb().insert(transactions).values(values);
  return values;
}
