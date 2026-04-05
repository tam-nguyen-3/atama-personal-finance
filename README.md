# Plaid Finance Dashboard MVP

A minimal personal finance dashboard built with Next.js that uses Plaid's Sandbox API to connect bank accounts and view aggregated transactions.

## Setup

### 1. Get Plaid Sandbox API Keys

1. Sign up at [dashboard.plaid.com](https://dashboard.plaid.com)
2. Navigate to **Team Settings > Keys**
3. Copy your **Client ID** and **Sandbox Secret**

### 2. Configure Environment

```bash
cp .env.local.example .env.local
```

Edit `.env.local` and paste your Plaid credentials:

```
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_sandbox_secret_here
PLAID_ENV=sandbox
```

### 3. Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Usage

1. Click **"Connect a Bank"** to open Plaid Link
2. Use these Sandbox test credentials:
   - Username: `user_good`
   - Password: `pass_good`
   - 2FA code: `1234`
3. Select a test institution (e.g., First Platypus Bank, Tartan Bank)
4. Once connected, accounts and transactions will appear on the dashboard
5. Connect multiple banks to see aggregated data

## Test Institutions

For variety when testing, try these Sandbox institutions:
- **First Platypus Bank** (`ins_109508`)
- **Tartan Bank** (`ins_109509`)

## Important Notes

- `data/items.json` stores Plaid access tokens locally and is gitignored — **never commit this file**
- This is a Sandbox-only MVP with no authentication — not for production use
- Transactions use Plaid's `/transactions/sync` endpoint with cursor-based pagination
