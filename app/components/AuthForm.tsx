"use client";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function AuthForm({ mode }: { mode: "login" | "signup" | "forgot" | "reset" }) {
  const [message, setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const data = new FormData(event.currentTarget); const email = String(data.get("email") ?? ""); const password = String(data.get("password") ?? "");
    if (mode === "forgot") { await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" }); setMessage("If an account exists, a reset link has been sent."); return; }
    if (mode === "reset") { const token = new URLSearchParams(location.search).get("token") ?? ""; const result = await authClient.resetPassword({ newPassword: password, token }); setMessage(result.error ? result.error.message ?? "The reset link is invalid or expired." : "Password updated. You can log in now."); return; }
    if (mode === "signup") { const result = await authClient.signUp.email({ name: String(data.get("name") ?? ""), email, password }); setMessage(result.error ? "We couldn’t create that account." : "If eligible, your account is ready. Please log in."); return; }
    const result = await authClient.signIn.email({ email, password, callbackURL: "/dashboard" }); if (result.error) setMessage("Email or password is incorrect."); else location.assign("/dashboard");
  }
  const title = mode === "login" ? "Welcome back" : mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Choose a new password";
  return <main className="landing"><h1>{title}</h1><form onSubmit={submit} className="auth-form">{mode === "signup" && <input name="name" placeholder="Name" required />}{mode !== "reset" && <input name="email" type="email" placeholder="Email" required />}{mode !== "forgot" && <input name="password" type="password" minLength={8} maxLength={128} placeholder="Password" required />}<button type="submit">Continue</button></form>{message && <p>{message}</p>}{mode === "login" && <p><Link href="/forgot-password">Forgot password?</Link> · <Link href="/signup">Create an account</Link></p>}</main>;
}
