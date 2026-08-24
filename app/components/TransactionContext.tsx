"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { DashboardTransaction } from "@/types/finance";

type TransactionContextValue = {
  transactions: DashboardTransaction[];
  setTransactions: Dispatch<SetStateAction<DashboardTransaction[]>>;
  clearTransactions: () => void;
};

const TransactionContext = createContext<TransactionContextValue | null>(null);

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);

  const clearTransactions = useCallback(() => {
    setTransactions([]);
  }, []);

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        setTransactions,
        clearTransactions,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransactions() {
  const ctx = useContext(TransactionContext);
  if (!ctx)
    throw new Error(
      "useTransactions must be used within a TransactionProvider",
    );
  return ctx;
}
