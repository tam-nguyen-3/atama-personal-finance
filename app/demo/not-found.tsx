import Link from "next/link";
import { PublicShell } from "@/app/components/public/PublicShell";

export default function DemoNotFound() {
  return (
    <PublicShell current="demo" compact>
      <section className="not-found-card ledger-paper">
        <p className="eyebrow">Demo budget not found</p>
        <h1>That sample budget isn’t here.</h1>
        <p>Return to the demo to explore the available read-only budgets.</p>
        <Link className="button button-primary" href="/demo">Back to demo</Link>
      </section>
    </PublicShell>
  );
}
