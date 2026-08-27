import type { Metadata } from "next";
import { AuthPage } from "@/app/components/public/AuthPage";
import { sanitizeDashboardPath } from "@/lib/auth-navigation";

export const metadata: Metadata = { title: "Log in", description: "Log in to your atama personal-finance dashboard." };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; registered?: string; reset?: string }> }) {
  const query = await searchParams;
  const initialStatus = query.registered === "1" ? "Your account is ready. Log in to continue." : query.reset === "1" ? "Your password was updated. Log in with your new password." : "";
  return <AuthPage mode="login" nextPath={sanitizeDashboardPath(query.next)} initialStatus={initialStatus} />;
}
