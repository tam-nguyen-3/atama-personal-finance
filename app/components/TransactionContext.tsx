"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
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

const STORAGE_KEY = "atama-transactions";

function isDashboardTransaction(
  value: unknown,
): value is DashboardTransaction {
  if (!value || typeof value !== "object") return false;
  const transaction = value as Partial<DashboardTransaction>;
  return (
    typeof transaction.transaction_id === "string" &&
    typeof transaction.institution_name === "string" &&
    typeof transaction.date === "string" &&
    typeof transaction.amount === "number"
  );
}

function loadTransactions(): DashboardTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(isDashboardTransaction)
      : [];
  } catch {
    return [];
  }
}

function saveTransactions(transactions: DashboardTransaction[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function TransactionProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] =
    useState<DashboardTransaction[]>(loadTransactions);

  useEffect(() => {
    saveTransactions(transactions);
  }, [transactions]);

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
