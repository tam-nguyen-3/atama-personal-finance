import Link from "next/link";
import type { Metadata } from "next";
import { Landmark, ListChecks, WalletCards } from "lucide-react";
import { LedgerPreview } from "@/app/components/public/LedgerPreview";
import { PublicShell } from "@/app/components/public/PublicShell";

export const metadata: Metadata = {
  title: "Personal finance, made calm",
  description: "See connected Sandbox accounts, spending, cash flow, and budgets in one calm personal-finance dashboard.",
};

export default function LandingPage() {
  return (
    <PublicShell current="home">
      <section className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">A quieter way to see your money</p>
          <h1>Personal finance, made calm.</h1>
          <p>Bring Sandbox accounts together, understand where your money went, and build budgets that fit real life.</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/demo">Explore the demo</Link>
            <Link className="button button-secondary" href="/signup">Create an account</Link>
          </div>
          <p className="hero-login">Already have an account? <Link href="/login">Log in</Link></p>
          <p className="hero-trust"><span aria-hidden="true" /> Plaid Sandbox only · No real bank credentials</p>
        </div>
        <LedgerPreview />
      </section>

      <section className="home-values" aria-labelledby="value-heading">
        <div className="section-intro"><p className="eyebrow">The useful parts, together</p><h2 id="value-heading">Clarity without the financial noise.</h2></div>
        <div className="value-grid">
          <article><Landmark aria-hidden="true" /><h3>Accounts in one place</h3><p>See checking, savings, and credit balances without jumping between views.</p></article>
          <article><WalletCards aria-hidden="true" /><h3>Spending that makes sense</h3><p>Turn recent activity into a readable picture of money in and money out.</p></article>
          <article><ListChecks aria-hidden="true" /><h3>Budgets you can use</h3><p>Give everyday spending a practical limit and see what remains at a glance.</p></article>
        </div>
      </section>

      <section className="home-final-cta ledger-paper">
        <div><p className="eyebrow">See before you connect</p><h2>Explore a complete sample dashboard.</h2><p>The public demo uses committed fixtures and never touches an account or protected API.</p></div>
        <Link className="button button-primary" href="/demo">Open the demo</Link>
      </section>
    </PublicShell>
  );
}
