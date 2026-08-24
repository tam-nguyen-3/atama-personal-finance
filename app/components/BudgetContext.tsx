"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getApiErrorMessage } from "@/lib/errors";
import type { Budget, BudgetUpdates } from "@/types/finance";

type BudgetContextValue = {
  budgets: Budget[];
  loaded: boolean;
  refreshBudgets: () => Promise<void>;
  createBudget: (name: string, limit: number) => Promise<Budget>;
  deleteBudget: (id: string) => Promise<void>;
  updateBudget: (id: string, updates: BudgetUpdates) => Promise<void>;
  addTransactionToBudget: (budgetId: string, transactionId: string) => Promise<void>;
  removeTransactionFromBudget: (budgetId: string, transactionId: string) => Promise<void>;
};

const BudgetContext = createContext<BudgetContextValue | null>(null);

async function responseError(response: Response, fallback: string) {
  return getApiErrorMessage(await response.json().catch(() => null), fallback);
}

export function BudgetProvider({ children }: { children: ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refreshBudgets = useCallback(async () => {
    try {
      const response = await fetch("/api/budgets");
      if (!response.ok) {
        throw new Error(await responseError(response, "Budgets could not be loaded."));
      }
      const data: unknown = await response.json();
      setBudgets(Array.isArray(data) ? (data as Budget[]) : []);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    const initialFetch = window.setTimeout(() => {
      void refreshBudgets().catch((error: unknown) => {
        console.error("Failed to load budgets:", error);
      });
    }, 0);
    return () => window.clearTimeout(initialFetch);
  }, [refreshBudgets]);

  const createBudget = useCallback(async (name: string, limit: number) => {
    const response = await fetch("/api/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, limit }),
    });
    if (!response.ok) {
      throw new Error(await responseError(response, "The budget could not be created."));
    }
    const created = (await response.json()) as Budget;
    setBudgets((current) => [...current, created]);
    return created;
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    const response = await fetch(`/api/budgets/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      throw new Error(await responseError(response, "The budget could not be deleted."));
    }
    setBudgets((current) => current.filter((budget) => budget.id !== id));
  }, []);

  const updateBudget = useCallback(async (id: string, updates: BudgetUpdates) => {
    const response = await fetch(`/api/budgets/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) {
      throw new Error(await responseError(response, "The budget could not be updated."));
    }
    const updated = (await response.json()) as Budget;
    setBudgets((current) =>
      current.map((budget) => (budget.id === id ? updated : budget)),
    );
  }, []);

  const addTransactionToBudget = useCallback(
    async (budgetId: string, transactionId: string) => {
      const response = await fetch(
        `/api/budgets/${encodeURIComponent(budgetId)}/transactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactionId }),
        },
      );
      if (!response.ok) {
        throw new Error(await responseError(response, "The transaction could not be assigned."));
      }
      const updated = (await response.json()) as Budget;
      setBudgets((current) =>
        current.map((budget) => (budget.id === budgetId ? updated : budget)),
      );
    },
    [],
  );

  const removeTransactionFromBudget = useCallback(
    async (budgetId: string, transactionId: string) => {
      const response = await fetch(
        `/api/budgets/${encodeURIComponent(budgetId)}/transactions/${encodeURIComponent(transactionId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(await responseError(response, "The transaction could not be removed."));
      }
      const updated = (await response.json()) as Budget;
      setBudgets((current) =>
        current.map((budget) => (budget.id === budgetId ? updated : budget)),
      );
    },
    [],
  );

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        loaded,
        refreshBudgets,
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
  const context = useContext(BudgetContext);
  if (!context) throw new Error("useBudgets must be used within a BudgetProvider");
  return context;
}
