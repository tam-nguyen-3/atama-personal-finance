import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";

const plaidEnvironment = process.env.PLAID_ENV || "sandbox";
const basePath =
  plaidEnvironment in PlaidEnvironments
    ? PlaidEnvironments[plaidEnvironment as keyof typeof PlaidEnvironments]
    : PlaidEnvironments.sandbox;

export const isPlaidConfigured = Boolean(
  process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET,
);

const configuration = new Configuration({
  basePath,
  baseOptions: {
    headers: {
      "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
      "PLAID-SECRET": process.env.PLAID_SECRET,
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
