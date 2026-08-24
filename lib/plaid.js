import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const plaidEnvironment = process.env.PLAID_ENV || "sandbox";

export const isPlaidConfigured = Boolean(
  process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET,
);

const configuration = new Configuration({
  basePath: PlaidEnvironments[plaidEnvironment] || PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
