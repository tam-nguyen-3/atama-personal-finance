# atama

[![CI](https://github.com/tam-nguyen-3/budget-app-1/actions/workflows/ci.yml/badge.svg)](https://github.com/tam-nguyen-3/budget-app-1/actions/workflows/ci.yml)

A calm, local-first personal finance dashboard that brings connected bank accounts, transaction history, cash flow, and budgets into one view. Atama uses Plaid Sandbox for financial data and PostgreSQL for durable storage.

![Placeholder for the atama dashboard overview](public/readme/dashboard-placeholder.svg)

> Replace the placeholder with a Plaid Sandbox screenshot when preparing the portfolio. A 1440 × 900 overview capture works well and contains no real financial information.

## Features

- Connect and disconnect multiple Plaid Sandbox institutions
- Persist accounts and complete transaction history in PostgreSQL
- Correctly apply Plaid transaction additions, modifications, and removals
- Retain transaction and budget history after an institution is disconnected
- Search transactions and explore category spending and monthly cash flow
- Create budgets and assign individual transactions to them
- Encrypt Plaid access tokens at rest with AES-256-GCM
- Accept verified, idempotent Plaid transaction webhooks when a public URL is configured
- Recover gracefully from unavailable credentials, sync errors, and empty data states

## Architecture

```mermaid
flowchart LR
  Browser[Next.js client dashboard] --> REST[Typed REST route handlers]
  REST --> DAL[Server-only data access and validation]
  DAL --> Postgres[(PostgreSQL 17)]
  REST --> Sync[Plaid sync service]
  Sync --> Plaid[Plaid Sandbox API]
  Sync --> Postgres
  Plaid -. signed webhook .-> Webhook[JWT verification and idempotency]
  Webhook --> Sync
```

The browser never receives Plaid access tokens or queries the database directly. Route handlers validate external input with Zod and return small DTOs. Access tokens use versioned AES-256-GCM ciphertext (`v1.iv.tag.ciphertext`), while transaction updates and the final sync cursor are committed together after every pagination run.

```mermaid
erDiagram
  USERS ||--o{ PLAID_ITEMS : owns
  USERS ||--o{ ACCOUNTS : owns
  USERS ||--o{ TRANSACTIONS : owns
  USERS ||--o{ BUDGETS : owns
  PLAID_ITEMS ||--o{ ACCOUNTS : contains
  PLAID_ITEMS ||--o{ TRANSACTIONS : synchronizes
  PLAID_ITEMS ||--o{ SYNC_RUNS : audits
  BUDGETS ||--o{ BUDGET_TRANSACTIONS : groups
  TRANSACTIONS ||--o| BUDGET_TRANSACTIONS : assigned_to
```

Better Auth owns the `users`, sessions, accounts, verification, and rate-limit tables. Every financial record is scoped to the signed-in user.

## Tech stack

- Next.js 16 App Router, React 19, and strict TypeScript
- PostgreSQL 17, Drizzle ORM, and Drizzle Kit migrations
- Plaid Node SDK and React Plaid Link
- Zod request validation and JOSE webhook verification
- Recharts and Tailwind CSS 4
- Vitest, jsdom, and React Testing Library
- Docker Compose for the local database

## Local setup

### Prerequisites

- Docker Desktop or another Docker Compose-compatible runtime
- [mise](https://mise.jdx.dev/) (the repository pins Node.js 22)
- Plaid Sandbox client ID and secret
- A Better Auth secret (and Resend credentials if password-reset emails should be delivered)

### Install and configure

Install the pinned Node.js version and project dependencies:

```bash
mise install
mise exec -- pnpm install
```

Copy the environment template. If you already have a local `.env`, add only the missing variables instead of overwriting it. Generate separate values for the Better Auth secret and Plaid encryption key; do not reuse either value.

```bash
cp .env.example .env
openssl rand -base64 32 # BETTER_AUTH_SECRET
openssl rand -base64 32 # PLAID_TOKEN_ENCRYPTION_KEY
```

Set the generated encryption key and your Sandbox credentials:

```dotenv
DATABASE_URL=postgresql://atama:atama@localhost:5432/atama
BETTER_AUTH_SECRET=your_generated_auth_secret
BETTER_AUTH_URL=http://localhost:3000
PLAID_TOKEN_ENCRYPTION_KEY=your_generated_32_byte_base64_key
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
```

Production requires an explicit `BETTER_AUTH_URL` using HTTPS. The application refuses to initialize authentication when `BETTER_AUTH_SECRET` is missing, blank, or shorter than 32 characters.

Do not rotate `PLAID_TOKEN_ENCRYPTION_KEY` after connecting an Item unless its stored token is re-encrypted; old ciphertext cannot be decrypted with a different key.

Start PostgreSQL, apply the checked-in migration, and run the app:

```bash
mise exec -- pnpm db:up
mise exec -- pnpm db:migrate
mise exec -- pnpm dev
```

### Docker database controls

Start the database in the background:

```bash
mise exec -- pnpm db:up
```

Restart it without deleting data:

```bash
docker compose restart database
```

Stop it without deleting data:

```bash
mise exec -- pnpm db:down
```

If you need a completely fresh local database, stop it and explicitly remove the volume, then start and migrate again. This permanently deletes local accounts, sessions, and financial data:

```bash
docker compose down -v
mise exec -- pnpm db:up
mise exec -- pnpm db:migrate
```

Open [http://localhost:3000](http://localhost:3000), select **Connect a Bank**, and use Plaid’s Sandbox credentials:

- Username: `user_good`
- Password: `pass_good`
- Verification code: `1234`

First Platypus Bank (`ins_109508`) and Tartan Bank (`ins_109509`) are useful test institutions.

This backend intentionally starts with a clean database. It does not import the old ignored `data/items.json` file or browser `localStorage` values.

## Optional webhook setup

The app works through manual synchronization without a webhook. To test webhooks, expose the local server through a tunnel, set `PLAID_WEBHOOK_URL` to its HTTPS `/api/plaid/webhook` URL before creating a Link token, and reconnect the Sandbox Item.

Incoming requests are accepted only when the `Plaid-Verification` ES256 JWT is valid, no more than five minutes old, and contains the exact SHA-256 hash of the raw request body. Duplicate bodies are stored once.

## REST API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/accounts` | List active connected accounts |
| `GET` | `/api/transactions?limit=100&cursor=...&query=...` | Page through saved transactions |
| `GET`, `POST` | `/api/budgets` | List or create budgets |
| `GET`, `PATCH`, `DELETE` | `/api/budgets/:id` | Read, edit, or delete a budget |
| `POST` | `/api/budgets/:id/transactions` | Assign a transaction |
| `DELETE` | `/api/budgets/:id/transactions/:transactionId` | Remove an assignment |
| `POST` | `/api/plaid/link-token` | Create a Plaid Link token |
| `POST` | `/api/plaid/exchange-token` | Store an encrypted Item and run its first sync |
| `POST` | `/api/plaid/sync` | Synchronize all connected Items |
| `DELETE` | `/api/plaid/items/:id` | Disconnect an Item while retaining history |
| `POST` | `/api/plaid/webhook` | Verify and process Plaid webhooks |

Errors use a consistent shape:

```json
{
  "error": {
    "code": "BAD_REQUEST",
    "message": "The request is invalid."
  }
}
```

## Quality checks

```bash
mise exec -- pnpm typecheck
mise exec -- pnpm lint
mise exec -- pnpm test
mise exec -- pnpm build
```

To run the PostgreSQL integration suite against an isolated, disposable database on port 5433:

```bash
mise exec -- pnpm db:test:up
mise exec -- pnpm test:integration
mise exec -- pnpm db:test:down
```

The 18 unit tests cover transaction and budget calculations, UI states, opaque pagination cursors, AES-GCM encryption and tamper detection, Plaid sync pagination recovery, and webhook signatures. Ten PostgreSQL integration tests cover budget persistence, assignments, transaction queries, account visibility, sync atomicity, disconnect history, and webhook idempotency.

GitHub Actions runs the unit-quality pipeline and PostgreSQL integration suite independently on pull requests and pushes to `main`.

## Current limitations

Atama is a multi-user, Sandbox-only application. It supports only email/password authentication; real Plaid data is intentionally out of scope.

## Roadmap

- Add monthly budget periods and category-based allocation
- Detect recurring expenses and summarize month-over-month changes
- Add background job processing for webhook-triggered syncs
# Authentication and database reset

This release replaces the original seeded local user with Better Auth accounts. Before applying the new initial migration locally, explicitly discard the old Docker database volume yourself (for example, `docker compose down -v`), then run `mise exec -- pnpm db:up` and `mise exec -- pnpm db:migrate`. This is intentionally not automated because it deletes local financial data.
