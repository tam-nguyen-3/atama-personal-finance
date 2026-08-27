import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    requestPasswordReset: mocks.requestPasswordReset,
    resetPassword: mocks.resetPassword,
    signIn: { email: mocks.signIn },
    signUp: { email: mocks.signUp },
  },
}));

import { AuthForm } from "@/app/components/AuthForm";

beforeEach(() => {
  Object.values(mocks).forEach((mock) => mock.mockReset());
  mocks.requestPasswordReset.mockResolvedValue({ data: {} });
  mocks.resetPassword.mockResolvedValue({ data: {} });
  mocks.signIn.mockResolvedValue({ error: { message: "invalid" } });
  mocks.signUp.mockResolvedValue({ data: {} });
});

describe("AuthForm", () => {
  it("owns validation and associates errors with signup fields", async () => {
    render(<AuthForm mode="signup" />);
    const form = screen.getByRole("button", { name: "Create account" }).closest("form");
    expect(form).toHaveAttribute("novalidate");
    fireEvent.submit(form!);
    expect(await screen.findByText("Enter your name.")).toBeVisible();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Enter your email address.")).toBeVisible();
    expect(screen.getByText("Use 8–128 characters.")).toBeVisible();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("reveals and masks a password with an accessible control", () => {
    render(<AuthForm mode="login" />);
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Show password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true");
  });

  it("redirects a successful signup to the neutral login confirmation", async () => {
    render(<AuthForm mode="signup" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Avery" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "avery@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-password" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "long-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(mocks.replace).toHaveBeenCalledWith("/login?registered=1"));
  });

  it("prevents duplicate submission while a request is pending", async () => {
    let resolve: ((value: { data: object }) => void) | undefined;
    mocks.signUp.mockImplementation(() => new Promise((done) => { resolve = done; }));
    render(<AuthForm mode="signup" />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Avery" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "avery@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "long-password" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "long-password" } });
    const button = screen.getByRole("button", { name: "Create account" });
    fireEvent.click(button);
    expect(await screen.findByRole("button", { name: "Creating account…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Creating account…" }));
    expect(mocks.signUp).toHaveBeenCalledOnce();
    resolve?.({ data: {} });
  });

  it("keeps password-reset requests neutral even when delivery fails", async () => {
    mocks.requestPasswordReset.mockRejectedValue(new Error("network"));
    render(<AuthForm mode="forgot" />);
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Send reset link" }));
    expect(await screen.findByText("If an eligible account exists, reset instructions are on their way.")).toBeVisible();
  });

  it("explains an invalid reset token without sending a request", async () => {
    render(<AuthForm mode="reset" />);
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "new-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Set new password" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("invalid or expired");
    expect(mocks.resetPassword).not.toHaveBeenCalled();
  });
});
