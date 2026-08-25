CREATE TYPE "public"."plaid_item_status" AS ENUM('active', 'error', 'disconnected');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('running', 'succeeded', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sync_trigger" AS ENUM('link', 'manual', 'webhook');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"official_name" text,
	"mask" text,
	"type" text NOT NULL,
	"subtype" text,
	"current_balance" numeric(18, 2),
	"available_balance" numeric(18, 2),
	"iso_currency_code" text,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" text NOT NULL,
	"issuer" text NOT NULL,
	"account_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "auth_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_verifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "budget_transactions" (
	"budget_id" uuid NOT NULL,
	"transaction_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_transactions_budget_id_transaction_id_pk" PRIMARY KEY("budget_id","transaction_id")
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"limit" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"institution_id" text,
	"institution_name" text NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"cursor" text,
	"status" "plaid_item_status" DEFAULT 'active' NOT NULL,
	"error_code" text,
	"error_message" text,
	"last_synced_at" timestamp with time zone,
	"disconnected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_webhooks" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "plaid_webhooks_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"body_sha256" text NOT NULL,
	"item_id" text,
	"webhook_type" text NOT NULL,
	"webhook_code" text NOT NULL,
	"payload" jsonb NOT NULL,
	"verified_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"processing_error" text
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sync_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"item_id" text NOT NULL,
	"trigger" "sync_trigger" NOT NULL,
	"status" "sync_status" DEFAULT 'running' NOT NULL,
	"added_count" integer DEFAULT 0 NOT NULL,
	"modified_count" integer DEFAULT 0 NOT NULL,
	"removed_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"account_id" text,
	"user_id" uuid NOT NULL,
	"institution_name" text NOT NULL,
	"date" date NOT NULL,
	"authorized_date" date,
	"amount" numeric(18, 2) NOT NULL,
	"iso_currency_code" text,
	"name" text NOT NULL,
	"merchant_name" text,
	"category_primary" text,
	"category_detailed" text,
	"pending" boolean DEFAULT false NOT NULL,
	"pending_transaction_id" text,
	"payment_channel" text,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"display_name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auth_accounts" ADD CONSTRAINT "auth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budget_transactions" ADD CONSTRAINT "budget_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plaid_items" ADD CONSTRAINT "plaid_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sync_runs" ADD CONSTRAINT "sync_runs_item_id_plaid_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."plaid_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_item_idx" ON "accounts" USING btree ("user_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_id_user_unique" ON "accounts" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_accounts_issuer_account_unique" ON "auth_accounts" USING btree ("issuer","account_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "budget_transactions_transaction_user_unique" ON "budget_transactions" USING btree ("transaction_id","user_id");--> statement-breakpoint
CREATE INDEX "budgets_user_created_idx" ON "budgets" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "budgets_id_user_unique" ON "budgets" USING btree ("id","user_id");--> statement-breakpoint
CREATE INDEX "plaid_items_user_status_idx" ON "plaid_items" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "plaid_items_id_user_unique" ON "plaid_items" USING btree ("id","user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plaid_webhooks_body_sha256_unique" ON "plaid_webhooks" USING btree ("body_sha256");--> statement-breakpoint
CREATE INDEX "sync_runs_item_started_idx" ON "sync_runs" USING btree ("item_id","started_at");--> statement-breakpoint
CREATE INDEX "transactions_user_date_id_idx" ON "transactions" USING btree ("user_id","date","id");--> statement-breakpoint
CREATE INDEX "transactions_item_idx" ON "transactions" USING btree ("item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_id_user_unique" ON "transactions" USING btree ("id","user_id");
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_item_owner_fk" FOREIGN KEY ("item_id", "user_id") REFERENCES "public"."plaid_items"("id", "user_id");
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_item_owner_fk" FOREIGN KEY ("item_id", "user_id") REFERENCES "public"."plaid_items"("id", "user_id");
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_owner_fk" FOREIGN KEY ("account_id", "user_id") REFERENCES "public"."accounts"("id", "user_id");
--> statement-breakpoint
ALTER TABLE "budget_transactions" ADD CONSTRAINT "budget_transactions_budget_owner_fk" FOREIGN KEY ("budget_id", "user_id") REFERENCES "public"."budgets"("id", "user_id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "budget_transactions" ADD CONSTRAINT "budget_transactions_transaction_owner_fk" FOREIGN KEY ("transaction_id", "user_id") REFERENCES "public"."transactions"("id", "user_id");
