"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const BudgetContext = createContext(null);

const STORAGE_KEY = "atama-budgets";

function loadBudgets() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBudgets(budgets) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(budgets));
}

export function BudgetProvider({ children }) {
  const [budgets, setBudgets] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setBudgets(loadBudgets());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveBudgets(budgets);
  }, [budgets, loaded]);

  const createBudget = useCallback((name, limit) => {
    const newBudget = {
      id: crypto.randomUUID(),
      name,
      limit: Number(limit),
      transactionIds: [],
    };
    setBudgets((prev) => [...prev, newBudget]);
    return newBudget;
  }, []);

  const deleteBudget = useCallback((id) => {
    setBudgets((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBudget = useCallback((id, updates) => {
    setBudgets((prev) =>
      prev.map((b) =>
        b.id === id
          ? { ...b, ...updates, id: b.id, transactionIds: b.transactionIds }
          : b
      )
    );
  }, []);

  const addTransactionToBudget = useCallback((budgetId, transactionId) => {
    setBudgets((prev) =>
      prev.map((b) =>
        b.id === budgetId && !b.transactionIds.includes(transactionId)
          ? { ...b, transactionIds: [...b.transactionIds, transactionId] }
          : b
      )
    );
  }, []);

  const removeTransactionFromBudget = useCallback((budgetId, transactionId) => {
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
