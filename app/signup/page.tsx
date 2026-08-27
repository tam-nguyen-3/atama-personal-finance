import type { Metadata } from "next";
import { AuthPage } from "@/app/components/public/AuthPage";

export const metadata: Metadata = { title: "Create an account", description: "Create an atama account for the Plaid Sandbox personal-finance dashboard." };

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
