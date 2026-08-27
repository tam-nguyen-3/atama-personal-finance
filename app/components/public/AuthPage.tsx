import { AuthForm } from "@/app/components/AuthForm";
import { LedgerPreview } from "@/app/components/public/LedgerPreview";
import { PublicShell } from "@/app/components/public/PublicShell";

type AuthPageProps = {
  mode: "login" | "signup" | "forgot" | "reset";
  nextPath?: string;
  resetToken?: string;
  initialStatus?: string;
};

export function AuthPage(props: AuthPageProps) {
  return (
    <PublicShell compact current={props.mode === "login" ? "login" : props.mode === "signup" ? "signup" : undefined}>
      <div className="auth-layout">
        <AuthForm {...props} />
        <aside className="auth-aside" aria-label="Sample atama insight">
          <p className="eyebrow">One calm view</p>
          <h2>Know what changed without chasing every number.</h2>
          <p>Connected balances, recent spending, and practical budgets stay together in one quiet workspace.</p>
          <LedgerPreview compact />
          <p className="sandbox-note">Plaid Sandbox only. Atama never asks for real bank credentials in this deployment.</p>
        </aside>
      </div>
    </PublicShell>
  );
}
