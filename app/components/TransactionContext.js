"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

const TransactionContext = createContext(null);

const STORAGE_KEY = "atama-transactions";

function loadTransactions() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTransactions(transactions) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

export function TransactionProvider({ children }) {
  const [transactions, setTransactions] = useState(loadTransactions);

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
