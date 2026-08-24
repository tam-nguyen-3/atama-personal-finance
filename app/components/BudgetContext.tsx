"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Budget, BudgetUpdates } from "@/types/finance";

type BudgetContextValue = {
  budgets: Budget[];
  loaded: boolean;
  createBudget: (name: string, limit: number) => Budget;
  deleteBudget: (id: string) => void;
  updateBudget: (id: string, updates: BudgetUpdates) => void;
  addTransactionToBudget: (budgetId: string, transactionId: string) => void;
  removeTransactionFromBudget: (
    budgetId: string,
    transactionId: string,
  ) => void;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

const STORAGE_KEY = "atama-budgets";

function isBudget(value: unknown): value is Budget {
  if (!value || typeof value !== "object") return false;
  const budget = value as Partial<Budget>;
  return (
    typeof budget.id === "string" &&
    typeof budget.name === "string" &&
    typeof budget.limit === "number" &&
    Array.isArray(budget.transactionIds) &&
    budget.transactionIds.every((id) => typeof id === "string")
  );
}

function loadBudgets(): Budget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isBudget) : [];
  } catch {
    return [];
  }
}

function saveBudgets(budgets: Budget[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
}

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadFromStorage = window.setTimeout(() => {
      setBudgets(loadBudgets());
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(loadFromStorage);
  }, []);

  useEffect(() => {
    if (loaded) saveBudgets(budgets);
  }, [budgets, loaded]);

  const createBudget = useCallback((name: string, limit: number) => {
    const newBudget: Budget = {
      id: crypto.randomUUID(),
      name,
      limit: Number(limit),
      transactionIds: [],
    };
    setBudgets((prev) => [...prev, newBudget]);
    return newBudget;
  }, []);

  const deleteBudget = useCallback((id: string) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBudget = useCallback((id: string, updates: BudgetUpdates) => {
    setBudgets((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, ...updates, id: b.id, transactionIds: b.transactionIds }
          : b
      )
    );
  }, []);

  const addTransactionToBudget = useCallback((budgetId: string, transactionId: string) => {
    setBudgets((prev) =>
      prev.map((b) =>
        b.id === budgetId && !b.transactionIds.includes(transactionId)
          ? { ...b, transactionIds: [...b.transactionIds, transactionId] }
          : b
      )
    );
  }, []);

  const removeTransactionFromBudget = useCallback((budgetId: string, transactionId: string) => {
    setBudgets((prev) =>
      prev.map((b) =>
        b.id === budgetId
          ? { ...b, transactionIds: b.transactionIds.filter((t) => t !== transactionId) }
          : b
      )
    );
  }, []);

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        loaded,
        createBudget,
        deleteBudget,
        updateBudget,
        addTransactionToBudget,
        removeTransactionFromBudget,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudgets() {
  const ctx = useContext(BudgetContext);
  if (!ctx) throw new Error("useBudgets must be used within a BudgetProvider");
  return ctx;
}
