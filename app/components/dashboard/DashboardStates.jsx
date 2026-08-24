"use client";

export function DashboardHeader({ onConnect, canConnect, connecting }) {
  return (
    <header className="flex items-center justify-between mb-10 animate-in">
      <div>
        <h1
          className="text-[22px] font-700 tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          atama
          <span
            aria-hidden="true"
            className="inline-block w-[6px] h-[6px] rounded-full ml-[2px] mb-[2px]"
            style={{ backgroundColor: "var(--color-accent)" }}
          />
        </h1>
        <p
          className="text-[12px] mt-0.5"
          style={{ color: "var(--color-text-muted)" }}
        >
          Your money, in one calm view.
        </p>
      </div>
      <button
        type="button"
        onClick={onConnect}
        disabled={!canConnect || connecting}
        className="text-[13px] font-600 px-5 py-2.5 rounded-full text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        {connecting ? "Connecting…" : "+ Connect a Bank"}
      </button>
    </header>
  );
}

export function ErrorBanner({ message, actionLabel, onAction, onDismiss }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-4 py-3 rounded-[10px] mb-6 text-[13px] animate-in"
      style={{
        backgroundColor: "var(--color-negative-bg)",
        color: "var(--color-negative)",
        border: "1px solid #fecaca",
      }}
    >
      <div>
        <p className="font-600 mb-0.5">We couldn’t update your dashboard.</p>
        <p>{message}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {onAction && (
          <button type="button" onClick={onAction} className="font-700">
            {actionLabel || "Try again"}
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="font-600 opacity-70 hover:opacity-100 transition-opacity"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div className="animate-in" aria-busy="true" aria-label="Loading dashboard">
      <div className="skeleton h-[104px] w-full mb-6" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-4">
          <div className="skeleton h-[160px] w-full" />
          <div className="skeleton h-[200px] w-full" />
        </div>
        <div className="lg:col-span-2">
          <div className="skeleton h-[400px] w-full" />
        </div>
      </div>
    </div>
  );
}

export function EmptyAccounts({ onConnect, canConnect, plaidUnavailable }) {
  return (
    <section className="flex flex-col items-center justify-center py-24 text-center animate-in">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-5"
        style={{ backgroundColor: "#f0fdf4", color: "var(--color-accent)" }}
      >
        <svg
          aria-hidden="true"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <rect x="1" y="4" width="22" height="16" rx="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      </div>
      <h2 className="text-[17px] font-600 mb-1">Bring your accounts together</h2>
      <p
        className="text-[13px] mb-6 max-w-sm"
        style={{ color: "var(--color-text-muted)" }}
      >
        {plaidUnavailable
          ? "Plaid is not available yet. Check your Sandbox credentials, then retry the connection."
          : "Link a Plaid Sandbox institution to explore balances, spending, cash flow, and budgets."}
      </p>
      <button
        type="button"
        onClick={onConnect}
        disabled={!canConnect}
        className="text-[13px] font-600 px-5 py-2.5 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ backgroundColor: "var(--color-accent)" }}
      >
        {plaidUnavailable ? "Connection unavailable" : "+ Connect a Bank"}
      </button>
    </section>
  );
}

export function EmptyTransactions({ hasSearch, onClearSearch }) {
  return (
    <div className="px-5 py-14 text-center">
      <p className="text-[14px] font-600 mb-1">
        {hasSearch ? "No matching transactions" : "No transactions yet"}
      </p>
      <p className="text-[12px]" style={{ color: "var(--color-text-muted)" }}>
        {hasSearch
          ? "Try a different merchant, account, or institution."
          : "Plaid may still be preparing transaction history for this account."}
      </p>
      {hasSearch && (
        <button
          type="button"
          onClick={onClearSearch}
          className="text-[12px] font-700 mt-4"
          style={{ color: "var(--color-accent)" }}
        >
          Clear search
        </button>
      )}
    </div>
  );
}
