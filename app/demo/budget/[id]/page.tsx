import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { PublicShell } from "@/app/components/public/PublicShell";
import { demoBudgets, demoTransactions } from "@/lib/demo-fixtures";
import { getBudgetSpent, sentenceCase } from "@/lib/dashboard";

type DemoBudgetProps = { params: Promise<{ id: string }> };
const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const date = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export async function generateMetadata({ params }: DemoBudgetProps): Promise<Metadata> {
  const { id } = await params;
  const budget = demoBudgets.find((item) => item.id === id);
  return { title: budget ? `${budget.name} demo budget` : "Demo budget not found" };
}

export default async function DemoBudget({ params }: DemoBudgetProps) {
  const { id } = await params;
  const budget = demoBudgets.find((item) => item.id === id);
  if (!budget) notFound();
  const spent = getBudgetSpent([budget], demoTransactions)[budget.id] ?? 0;
  const remaining = Math.max(budget.limit - spent, 0);
  const percent = Math.min((spent / budget.limit) * 100, 100);
  const assigned = demoTransactions.filter((transaction) => budget.transactionIds.includes(transaction.transaction_id));

  return (
    <PublicShell current="demo">
      <div className="demo-budget-detail">
        <Link className="back-link" href="/demo"><ArrowLeft aria-hidden="true" /> Back to demo</Link>
        <div className="demo-heading-row"><div><p className="eyebrow">Read-only budget</p><h1>{budget.name}</h1><p>See how assigned sample transactions contribute to this monthly plan.</p></div><div className="demo-readonly" role="status"><span aria-hidden="true" /> Sample data · Read only</div></div>
        <section className="budget-detail-summary ledger-paper">
          <div><p className="data-label">Spent</p><strong className="tabular-nums">{currency.format(spent)}</strong></div>
          <div><p className="data-label">Monthly limit</p><strong className="tabular-nums">{currency.format(budget.limit)}</strong></div>
          <div><p className="data-label">Remaining</p><strong className="tabular-nums positive-copy">{currency.format(remaining)}</strong></div>
          <span className="budget-track budget-track-wide" aria-label={`${Math.round(percent)} percent used`}><i style={{ width: `${percent}%` }} /></span>
        </section>
        <section className="demo-card budget-detail-list"><div className="card-heading"><div><p className="data-label">Assigned activity</p><h2>Transactions in this budget</h2></div><span>{assigned.length}</span></div>{assigned.map((transaction) => <div className="budget-detail-row" key={transaction.transaction_id}><span><strong>{transaction.merchant_name || transaction.name}</strong><small>{sentenceCase(transaction.personal_finance_category?.primary)} · {date.format(new Date(`${transaction.date}T12:00:00`))}</small></span><strong className="tabular-nums">{currency.format(transaction.amount)}</strong></div>)}</section>
        <aside className="demo-cta"><div><p className="eyebrow">Make it yours</p><h2>Build a budget around your own goals.</h2></div><Link className="button button-primary" href="/signup">Create an account</Link></aside>
      </div>
    </PublicShell>
  );
}
