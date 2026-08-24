export type DashboardAccount = {
  account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  balances: {
    current: number | null;
    available?: number | null;
    iso_currency_code?: string | null;
  };
  institution_name: string;
  item_id: string;
};

export type DashboardTransaction = {
  transaction_id: string;
  account_id?: string;
  date: string;
  amount: number;
  name: string;
  merchant_name?: string | null;
  personal_finance_category?: {
    primary: string;
    detailed?: string;
  } | null;
  institution_name: string;
};

export type Budget = {
  id: string;
  name: string;
  limit: number;
  transactionIds: string[];
};

export type BudgetUpdates = Partial<Pick<Budget, "name" | "limit">>;

export type InstitutionAccountGroup = {
  accounts: DashboardAccount[];
  item_id: string;
};

export type CategoryTotal = {
  category: string;
  total: number;
};

export type CashFlowPoint = {
  month: string;
  monthLabel: string;
  income: number;
  expenses: number;
  net: number;
};

export type CashFlowTotals = Omit<CashFlowPoint, "month" | "monthLabel">;

export type PlaidStoredItem = {
  access_token: string;
  item_id: string;
  institution_name: string;
  cursor: string | null;
};

export type DashboardError = {
  message: string;
  retry: boolean;
};

export type TransactionsPage = {
  data: DashboardTransaction[];
  nextCursor: string | null;
};
