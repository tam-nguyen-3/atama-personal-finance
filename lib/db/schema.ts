import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const LOCAL_USER_ID = "00000000-0000-4000-8000-000000000001";

export const plaidItemStatus = pgEnum("plaid_item_status", [
  "active",
  "error",
  "disconnected",
]);

export const syncStatus = pgEnum("sync_status", [
  "running",
  "succeeded",
  "failed",
]);

export const syncTrigger = pgEnum("sync_trigger", [
  "link",
  "manual",
  "webhook",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const plaidItems = pgTable(
  "plaid_items",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    institutionId: text("institution_id"),
    institutionName: text("institution_name").notNull(),
    accessTokenEncrypted: text("access_token_encrypted").notNull(),
    cursor: text("cursor"),
    status: plaidItemStatus("status").default("active").notNull(),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    disconnectedAt: timestamp("disconnected_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("plaid_items_user_status_idx").on(table.userId, table.status)],
);

export const accounts = pgTable(
  "accounts",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => plaidItems.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    officialName: text("official_name"),
    mask: text("mask"),
    type: text("type").notNull(),
    subtype: text("subtype"),
    currentBalance: numeric("current_balance", { precision: 18, scale: 2 }),
    availableBalance: numeric("available_balance", { precision: 18, scale: 2 }),
    isoCurrencyCode: text("iso_currency_code"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("accounts_user_item_idx").on(table.userId, table.itemId)],
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => plaidItems.id),
    accountId: text("account_id").references(() => accounts.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    institutionName: text("institution_name").notNull(),
    date: date("date").notNull(),
    authorizedDate: date("authorized_date"),
    amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
    isoCurrencyCode: text("iso_currency_code"),
    name: text("name").notNull(),
    merchantName: text("merchant_name"),
    categoryPrimary: text("category_primary"),
    categoryDetailed: text("category_detailed"),
    pending: boolean("pending").default(false).notNull(),
    pendingTransactionId: text("pending_transaction_id"),
    paymentChannel: text("payment_channel"),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("transactions_user_date_id_idx").on(
      table.userId,
      table.date,
      table.id,
    ),
    index("transactions_item_idx").on(table.itemId),
  ],
);

export const budgets = pgTable(
  "budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    name: text("name").notNull(),
    limit: numeric("limit", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("budgets_user_created_idx").on(table.userId, table.createdAt)],
);

export const budgetTransactions = pgTable(
  "budget_transactions",
  {
    budgetId: uuid("budget_id")
      .notNull()
      .references(() => budgets.id, { onDelete: "cascade" }),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.budgetId, table.transactionId] }),
    uniqueIndex("budget_transactions_transaction_unique").on(
      table.transactionId,
    ),
  ],
);

export const syncRuns = pgTable(
  "sync_runs",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    itemId: text("item_id")
      .notNull()
      .references(() => plaidItems.id),
    trigger: syncTrigger("trigger").notNull(),
    status: syncStatus("status").default("running").notNull(),
    addedCount: integer("added_count").default(0).notNull(),
    modifiedCount: integer("modified_count").default(0).notNull(),
    removedCount: integer("removed_count").default(0).notNull(),
    errorMessage: text("error_message"),
    startedAt: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (table) => [index("sync_runs_item_started_idx").on(table.itemId, table.startedAt)],
);

export const plaidWebhooks = pgTable(
  "plaid_webhooks",
  {
    id: bigint("id", { mode: "number" }).generatedAlwaysAsIdentity().primaryKey(),
    bodySha256: text("body_sha256").notNull(),
    itemId: text("item_id"),
    webhookType: text("webhook_type").notNull(),
    webhookCode: text("webhook_code").notNull(),
    payload: jsonb("payload").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    processingError: text("processing_error"),
  },
  (table) => [uniqueIndex("plaid_webhooks_body_sha256_unique").on(table.bodySha256)],
);
