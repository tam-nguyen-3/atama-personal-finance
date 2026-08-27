import type { Budget, DashboardAccount, DashboardTransaction } from "@/types/finance";

export const demoAccounts: DashboardAccount[] = [
  { account_id: "demo-checking", item_id: "demo-item-pine", name: "Everyday checking", type: "depository", subtype: "checking", institution_name: "Pine Bank", balances: { current: 4820.5, available: 4512.35, iso_currency_code: "USD" } },
  { account_id: "demo-savings", item_id: "demo-item-pine", name: "Rainy day savings", type: "depository", subtype: "savings", institution_name: "Pine Bank", balances: { current: 12750, available: 12750, iso_currency_code: "USD" } },
  { account_id: "demo-card", item_id: "demo-item-cove", name: "Everyday rewards", type: "credit", subtype: "credit card", institution_name: "Cove Credit", balances: { current: 684.2, available: 4315.8, iso_currency_code: "USD" } },
];

export const demoTransactions: DashboardTransaction[] = [
  { transaction_id: "demo-market", account_id: "demo-checking", date: "2026-08-20", amount: 42.15, name: "Neighborhood Market", merchant_name: "Neighborhood Market", institution_name: "Pine Bank", personal_finance_category: { primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK_GROCERIES" } },
  { transaction_id: "demo-coffee", account_id: "demo-card", date: "2026-08-19", amount: 6.75, name: "Harbor Coffee", merchant_name: "Harbor Coffee", institution_name: "Cove Credit", personal_finance_category: { primary: "FOOD_AND_DRINK" } },
  { transaction_id: "demo-payroll-aug", account_id: "demo-checking", date: "2026-08-18", amount: -3200, name: "Payroll", merchant_name: null, institution_name: "Pine Bank", personal_finance_category: { primary: "INCOME" } },
  { transaction_id: "demo-transit", account_id: "demo-card", date: "2026-08-14", amount: 86, name: "City Transit", merchant_name: "City Transit", institution_name: "Cove Credit", personal_finance_category: { primary: "TRANSPORTATION" } },
  { transaction_id: "demo-rent", account_id: "demo-checking", date: "2026-08-02", amount: 1240, name: "Oak Street Apartments", merchant_name: null, institution_name: "Pine Bank", personal_finance_category: { primary: "RENT_AND_UTILITIES" } },
  { transaction_id: "demo-payroll-jul", account_id: "demo-checking", date: "2026-07-18", amount: -3200, name: "Payroll", institution_name: "Pine Bank", personal_finance_category: { primary: "INCOME" } },
  { transaction_id: "demo-jul-expense", account_id: "demo-card", date: "2026-07-08", amount: 1510, name: "July spending", institution_name: "Cove Credit", personal_finance_category: { primary: "GENERAL_MERCHANDISE" } },
  { transaction_id: "demo-payroll-jun", account_id: "demo-checking", date: "2026-06-18", amount: -3200, name: "Payroll", institution_name: "Pine Bank", personal_finance_category: { primary: "INCOME" } },
  { transaction_id: "demo-jun-expense", account_id: "demo-card", date: "2026-06-08", amount: 1745, name: "June spending", institution_name: "Cove Credit", personal_finance_category: { primary: "GENERAL_MERCHANDISE" } },
  { transaction_id: "demo-payroll-may", account_id: "demo-checking", date: "2026-05-18", amount: -3120, name: "Payroll", institution_name: "Pine Bank", personal_finance_category: { primary: "INCOME" } },
  { transaction_id: "demo-may-expense", account_id: "demo-card", date: "2026-05-08", amount: 1630, name: "May spending", institution_name: "Cove Credit", personal_finance_category: { primary: "GENERAL_MERCHANDISE" } },
  { transaction_id: "demo-payroll-apr", account_id: "demo-checking", date: "2026-04-18", amount: -3120, name: "Payroll", institution_name: "Pine Bank", personal_finance_category: { primary: "INCOME" } },
  { transaction_id: "demo-apr-expense", account_id: "demo-card", date: "2026-04-08", amount: 1880, name: "April spending", institution_name: "Cove Credit", personal_finance_category: { primary: "GENERAL_MERCHANDISE" } },
  { transaction_id: "demo-payroll-mar", account_id: "demo-checking", date: "2026-03-18", amount: -3050, name: "Payroll", institution_name: "Pine Bank", personal_finance_category: { primary: "INCOME" } },
  { transaction_id: "demo-mar-expense", account_id: "demo-card", date: "2026-03-08", amount: 1690, name: "March spending", institution_name: "Cove Credit", personal_finance_category: { primary: "GENERAL_MERCHANDISE" } },
];

export const demoBudgets: Budget[] = [
  { id: "demo-food", name: "Groceries", limit: 600, transactionIds: ["demo-market", "demo-coffee"] },
  { id: "demo-transport", name: "Getting around", limit: 180, transactionIds: ["demo-transit"] },
  { id: "demo-home", name: "Home", limit: 1450, transactionIds: ["demo-rent"] },
];
