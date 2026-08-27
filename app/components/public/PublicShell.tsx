import Link from "next/link";
import type { ReactNode } from "react";

type PublicShellProps = {
  children: ReactNode;
  current?: "home" | "demo" | "login" | "signup";
  compact?: boolean;
};

export function BrandMark() {
  return (
    <Link className="brand-mark" href="/" aria-label="atama home">
      atama<span aria-hidden="true" />
    </Link>
  );
}

export function PublicShell({ children, current, compact = false }: PublicShellProps) {
  return (
    <div className="public-shell">
      <header className="public-header">
        <BrandMark />
        <nav aria-label="Public navigation" className="public-nav">
          <Link href="/demo" aria-current={current === "demo" ? "page" : undefined}>Demo</Link>
          <Link href="/login" aria-current={current === "login" ? "page" : undefined}>Log in</Link>
          <Link className="button button-small button-primary" href="/signup" aria-current={current === "signup" ? "page" : undefined}>Create account</Link>
        </nav>
      </header>
      <main className={compact ? "public-main public-main-compact" : "public-main"}>{children}</main>
      <footer className="public-footer">
        <p>atama · Personal finance, made calm.</p>
        <p>Plaid Sandbox only. No real bank credentials.</p>
      </footer>
    </div>
  );
}
