"use client";

import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

type AuthMode = "login" | "signup" | "forgot" | "reset";
type FieldName = "name" | "email" | "password" | "confirmation";
type FieldErrors = Partial<Record<FieldName, string>>;

type AuthFormProps = {
  mode: AuthMode;
  nextPath?: string;
  resetToken?: string;
  initialStatus?: string;
};

const modeCopy: Record<AuthMode, { eyebrow: string; title: string; description: string; submit: string; busy: string }> = {
  login: { eyebrow: "Welcome back", title: "Return to your calm view.", description: "Sign in to see your connected accounts, spending, and budgets.", submit: "Sign in", busy: "Signing in…" },
  signup: { eyebrow: "Create an account", title: "Start with a clearer view.", description: "Use at least 8 characters for your password. You’ll sign in after creating your account.", submit: "Create account", busy: "Creating account…" },
  forgot: { eyebrow: "Password help", title: "Find your way back in.", description: "Enter your email and we’ll send reset instructions if an account is eligible.", submit: "Send reset link", busy: "Sending link…" },
  reset: { eyebrow: "Password reset", title: "Choose a new password.", description: "Use 8–128 characters and choose something you don’t use elsewhere.", submit: "Set new password", busy: "Updating password…" },
};

function PasswordField({ name, label, error, autoComplete }: { name: "password" | "confirmation"; label: string; error?: string; autoComplete: string }) {
  const [visible, setVisible] = useState(false);
  const errorId = `${name}-error`;
  return (
    <div className="form-field">
      <label htmlFor={name}>{label}</label>
      <div className="password-control">
        <input id={name} data-field={name} name={name} type={visible ? "text" : "password"} autoComplete={autoComplete} minLength={8} maxLength={128} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />
        <button type="button" onClick={() => setVisible((value) => !value)} aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible}>
          {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
        </button>
      </div>
      {error && <p className="field-error" id={errorId}>{error}</p>}
    </div>
  );
}

function validate(mode: AuthMode, values: Record<FieldName, string>): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === "signup" && !values.name.trim()) errors.name = "Enter your name.";
  if (mode !== "reset") {
    if (!values.email.trim()) errors.email = "Enter your email address.";
    else if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email address.";
  }
  if (mode !== "forgot") {
    if (values.password.length < 8 || values.password.length > 128) errors.password = "Use 8–128 characters.";
    if ((mode === "signup" || mode === "reset") && values.confirmation !== values.password) errors.confirmation = "Passwords must match.";
  }
  return errors;
}

export function AuthForm({ mode, nextPath = "/dashboard", resetToken = "", initialStatus = "" }: AuthFormProps) {
  const router = useRouter();
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState(initialStatus);
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [submitting, setSubmitting] = useState(false);
  const copy = modeCopy[mode];

  function clearFieldError(field: FieldName) {
    if (!errors[field]) return;
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const values: Record<FieldName, string> = {
      name: String(data.get("name") ?? ""),
      email: String(data.get("email") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      confirmation: String(data.get("confirmation") ?? ""),
    };
    const nextErrors = validate(mode, values);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      setStatus("");
      const first = (["name", "email", "password", "confirmation"] as FieldName[]).find((field) => nextErrors[field]);
      requestAnimationFrame(() => form.querySelector<HTMLElement>(`[data-field="${first}"]`)?.focus());
      return;
    }

    setSubmitting(true);
    setErrors({});
    setStatus("");
    try {
      if (mode === "forgot") {
        await authClient.requestPasswordReset({ email: values.email, redirectTo: "/reset-password" });
        setStatusTone("success");
        setStatus("If an eligible account exists, reset instructions are on their way.");
        return;
      }
      if (mode === "reset") {
        if (!resetToken) {
          setStatusTone("error");
          setStatus("This reset link is invalid or expired. Request a new one to continue.");
          return;
        }
        const result = await authClient.resetPassword({ newPassword: values.password, token: resetToken });
        if (result.error) {
          setStatusTone("error");
          setStatus("This reset link is invalid or expired. Request a new one to continue.");
        } else {
          router.replace("/login?reset=1");
        }
        return;
      }
      if (mode === "signup") {
        const result = await authClient.signUp.email({ name: values.name.trim(), email: values.email, password: values.password });
        if (result.error) {
          setStatusTone("error");
          setStatus("We couldn’t create that account. Check your details or try signing in.");
        } else {
          router.replace("/login?registered=1");
        }
        return;
      }
      const result = await authClient.signIn.email({ email: values.email, password: values.password, callbackURL: nextPath });
      if (result.error) {
        setStatusTone("error");
        setStatus("Email or password is incorrect.");
      } else {
        window.location.assign(nextPath);
      }
    } catch {
      setStatusTone(mode === "forgot" ? "success" : "error");
      setStatus(mode === "forgot" ? "If an eligible account exists, reset instructions are on their way." : "We couldn’t complete that request. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <p className="eyebrow">{copy.eyebrow}</p>
      <h1 id="auth-title">{copy.title}</h1>
      <p className="auth-description">{copy.description}</p>
      {status && <div className={`auth-status auth-status-${statusTone}`} role={statusTone === "error" ? "alert" : "status"}>{status}</div>}
      <form className="auth-form" onSubmit={submit} onChange={(event) => clearFieldError((event.target as Element).getAttribute("name") as FieldName)} noValidate>
        {mode === "signup" && <div className="form-field"><label htmlFor="name">Name</label><input id="name" data-field="name" name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} />{errors.name && <p className="field-error" id="name-error">{errors.name}</p>}</div>}
        {mode !== "reset" && <div className="form-field"><label htmlFor="email">Email</label><input id="email" data-field="email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} />{errors.email && <p className="field-error" id="email-error">{errors.email}</p>}</div>}
        {mode !== "forgot" && <PasswordField name="password" label={mode === "reset" ? "New password" : "Password"} error={errors.password} autoComplete={mode === "login" ? "current-password" : "new-password"} />}
        {(mode === "signup" || mode === "reset") && <PasswordField name="confirmation" label="Confirm password" error={errors.confirmation} autoComplete="new-password" />}
        <button className="button button-primary auth-submit" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? copy.busy : copy.submit}</button>
      </form>
      <nav className="auth-links" aria-label="Authentication options">
        {mode === "login" && <><Link href="/forgot-password">Forgot password?</Link><span aria-hidden="true">·</span><Link href="/signup">Create an account</Link></>}
        {mode === "signup" && <><span>Already have an account?</span><Link href="/login">Log in</Link></>}
        {mode === "forgot" && <Link href="/login">Back to login</Link>}
        {mode === "reset" && <><Link href="/forgot-password">Request a new link</Link><span aria-hidden="true">·</span><Link href="/login">Back to login</Link></>}
      </nav>
    </section>
  );
}
