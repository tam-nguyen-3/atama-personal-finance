import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function LedgerPreview({ compact = false }: { compact?: boolean }) {
  return (
    <section className={`ledger-preview${compact ? " ledger-preview-compact" : ""}`} aria-label="Sample monthly financial snapshot">
      <div className="ledger-preview-topline">
        <div>
          <p className="data-label">Available today</p>
          <p className="ledger-balance tabular-nums">{usd.format(4820.5)}</p>
        </div>
        <span className="status-pill">On track</span>
      </div>
      <div className="ledger-rule" />
      <div className="ledger-flow" aria-label="August cash flow: 3,200 dollars in and 1,482 dollars out">
        <div><span><ArrowDownLeft aria-hidden="true" /> In</span><strong className="tabular-nums">{usd.format(3200)}</strong></div>
        <div><span><ArrowUpRight aria-hidden="true" /> Out</span><strong className="tabular-nums">{usd.format(1482)}</strong></div>
      </div>
      {!compact && (
        <>
          <div className="mini-chart" aria-hidden="true">
            {[38, 52, 45, 66, 58, 78].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
          </div>
          <div className="ledger-rows">
            <div><span>Neighborhood Market<small>Groceries</small></span><strong className="tabular-nums">−$42.15</strong></div>
            <div><span>Monthly budget<small>$384 of $600</small></span><strong className="positive-copy tabular-nums">$216 left</strong></div>
          </div>
        </>
      )}
    </section>
  );
}
