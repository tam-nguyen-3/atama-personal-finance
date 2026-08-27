"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { ArrowDownLeft, ArrowUpRight, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { demoAccounts, demoBudgets, demoTransactions } from "@/lib/demo-fixtures";
import { filterTransactions, getBudgetSpent, getCashFlowData, getCashFlowTotals, getTotalBalance, sentenceCase } from "@/lib/dashboard";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const shortCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

function formatDate(value: string) {
  return date.format(new Date(`${value}T12:00:00`));
}

function TransactionRows({ transactions = demoTransactions.slice(0, 5) }: { transactions?: typeof demoTransactions }) {
  return (
    <div className="demo-transactions-list">
      {transactions.map((transaction) => {
        const income = transaction.amount < 0;
        return (
          <div className="demo-transaction-row" key={transaction.transaction_id}>
            <span className={`transaction-icon${income ? " transaction-icon-income" : ""}`} aria-hidden="true">
              {income ? <ArrowDownLeft /> : <ArrowUpRight />}
            </span>
            <span className="transaction-identity">
              <strong>{transaction.merchant_name || transaction.name}</strong>
              <small>{sentenceCase(transaction.personal_finance_category?.primary) || "Uncategorized"} · {formatDate(transaction.date)}</small>
            </span>
            <span className={`transaction-amount tabular-nums${income ? " positive-copy" : ""}`}>
              {income ? "+" : "−"}{currency.format(Math.abs(transaction.amount))}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function BudgetCards() {
  const spent = getBudgetSpent(demoBudgets, demoTransactions);
  return (
    <div className="demo-budget-grid">
      {demoBudgets.map((budget) => {
        const value = spent[budget.id] ?? 0;
        const percent = Math.min((value / budget.limit) * 100, 100);
        return (
          <Link className="demo-budget-card" href={`/demo/budget/${budget.id}`} key={budget.id}>
            <div><span>{budget.name}</span><strong className="tabular-nums">{currency.format(value)} <small>of {currency.format(budget.limit)}</small></strong></div>
            <span className="budget-track" aria-label={`${Math.round(percent)} percent used`}><i style={{ width: `${percent}%` }} /></span>
            <p className="tabular-nums">{currency.format(Math.max(budget.limit - value, 0))} left</p>
          </Link>
        );
      })}
    </div>
  );
}

export function DemoDashboard() {
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const filteredTransactions = useMemo(() => filterTransactions(demoTransactions, query), [query]);
  const cashFlow = getCashFlowData(demoTransactions);
  const cashFlowTotals = getCashFlowTotals(cashFlow);
  const totalBalance = getTotalBalance(demoAccounts);

  function clearSearch() {
    setQuery("");
    searchRef.current?.focus();
  }

  return (
    <Tabs.Root className="demo-dashboard" defaultValue="overview">
      <div className="demo-heading-row">
        <div>
          <p className="eyebrow">Public demo</p>
          <h1>A clear view of everyday money.</h1>
          <p>Explore a complete dashboard built from sample data.</p>
        </div>
        <div className="demo-readonly" role="status"><span aria-hidden="true" /> Sample data · Read only</div>
      </div>

      <Tabs.List className="demo-tabs" aria-label="Demo dashboard views">
        <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
        <Tabs.Trigger value="cashflow">Cash flow</Tabs.Trigger>
        <Tabs.Trigger value="transactions">Transactions</Tabs.Trigger>
        <Tabs.Trigger value="budgets">Budgets</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content className="demo-tab-panel" value="overview">
        <section className="demo-summary-card ledger-paper">
          <div><p className="data-label">Across 3 sample accounts</p><strong className="demo-total tabular-nums">{currency.format(totalBalance)}</strong><p className="positive-copy">+$1,718 net cash flow in August</p></div>
          <div className="summary-bars" aria-hidden="true">{cashFlow.map((point) => <i key={point.month} style={{ height: `${Math.max(24, point.net / 25)}px` }} />)}</div>
        </section>
        <div className="demo-overview-grid">
          <section className="demo-card"><div className="card-heading"><div><p className="data-label">Accounts</p><h2>Connected balances</h2></div><span>{demoAccounts.length}</span></div><div className="account-list">{demoAccounts.map((account) => <div key={account.account_id}><span><strong>{account.name}</strong><small>{account.institution_name}</small></span><strong className="tabular-nums">{currency.format(account.balances.current ?? 0)}</strong></div>)}</div></section>
          <section className="demo-card"><div className="card-heading"><div><p className="data-label">Recent activity</p><h2>Latest transactions</h2></div></div><TransactionRows /></section>
        </div>
        <section className="demo-card demo-budget-section"><div className="card-heading"><div><p className="data-label">August plan</p><h2>Budgets at a glance</h2></div><span>3 on track</span></div><BudgetCards /></section>
      </Tabs.Content>

      <Tabs.Content className="demo-tab-panel" value="cashflow">
        <div className="cashflow-stats">
          <div><span>Income</span><strong className="tabular-nums positive-copy">{shortCurrency.format(cashFlowTotals.income)}</strong></div>
          <div><span>Spending</span><strong className="tabular-nums">{shortCurrency.format(cashFlowTotals.expenses)}</strong></div>
          <div><span>Net</span><strong className="tabular-nums">{shortCurrency.format(cashFlowTotals.net)}</strong></div>
        </div>
        <section className="demo-card cashflow-card">
          <div className="card-heading"><div><p className="data-label">Six-month view</p><h2>Money in and out</h2></div></div>
          <div className="cashflow-chart" aria-label="Monthly income and spending chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow} accessibilityLayer margin={{ top: 12, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid vertical={false} stroke="var(--color-border)" strokeDasharray="3 5" />
                <XAxis dataKey="monthLabel" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }} />
                <Tooltip formatter={(value) => currency.format(Number(value))} cursor={{ fill: "var(--color-bg)" }} />
                <Bar dataKey="income" name="Income" fill="var(--color-accent)" radius={[5, 5, 0, 0]} />
                <Bar dataKey="expenses" name="Spending" fill="#c9a46c" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ul className="sr-only">{cashFlow.map((point) => <li key={point.month}>{point.monthLabel}: {currency.format(point.income)} income and {currency.format(point.expenses)} spending.</li>)}</ul>
        </section>
      </Tabs.Content>

      <Tabs.Content className="demo-tab-panel" value="transactions">
        <section className="demo-card">
          <div className="transaction-toolbar"><div><p className="data-label">Sample history</p><h2>Transactions</h2></div><label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search transactions</span><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search merchant or bank" />{query && <button type="button" onClick={clearSearch} aria-label="Clear transaction search"><X aria-hidden="true" /></button>}</label></div>
          {filteredTransactions.length ? <TransactionRows transactions={filteredTransactions} /> : <div className="demo-empty"><h3>No matching transactions</h3><p>Try another merchant, category, or bank.</p><button type="button" onClick={clearSearch}>Clear search</button></div>}
        </section>
      </Tabs.Content>

      <Tabs.Content className="demo-tab-panel" value="budgets">
        <section className="demo-card"><div className="card-heading"><div><p className="data-label">August plan</p><h2>Monthly budgets</h2></div><span>Read only</span></div><BudgetCards /></section>
      </Tabs.Content>

      <aside className="demo-cta"><div><p className="eyebrow">Ready for your own view?</p><h2>Turn transactions into a plan that fits.</h2></div><Link className="button button-primary" href="/signup">Create your dashboard</Link></aside>
    </Tabs.Root>
  );
}
