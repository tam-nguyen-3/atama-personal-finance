import type { ReactNode } from "react";
import { BudgetProvider } from "../components/BudgetContext";
import { TransactionProvider } from "../components/TransactionContext";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <BudgetProvider><TransactionProvider>{children}</TransactionProvider></BudgetProvider>;
}
