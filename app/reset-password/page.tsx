import type { Metadata } from "next";
import { AuthPage } from "@/app/components/public/AuthPage";

export const metadata: Metadata = { title: "Choose a new password", description: "Set a new password for your atama account." };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const query = await searchParams;
  const token = Array.isArray(query.token) ? query.token[0] : query.token;
  return <AuthPage mode="reset" resetToken={token ?? ""} />;
}
