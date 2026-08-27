import type { Metadata } from "next";
import { AuthPage } from "@/app/components/public/AuthPage";

export const metadata: Metadata = { title: "Reset your password", description: "Request password-reset instructions for your atama account." };

export default function ForgotPasswordPage() {
  return <AuthPage mode="forgot" />;
}
