import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  EmptyAccounts,
  EmptyTransactions,
  ErrorBanner,
} from "@/app/components/dashboard/DashboardStates";

describe("dashboard states", () => {
  it("explains when Plaid is unavailable and disables connection", () => {
    render(
      <EmptyAccounts
        onConnect={() => {}}
        canConnect={false}
        plaidUnavailable
      />,
    );

    expect(screen.getByText(/check your Sandbox credentials/i)).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Connection unavailable" }),
    ).toBeDisabled();
  });

  it("offers a retry action for recoverable errors", () => {
    const retry = vi.fn();
    render(
      <ErrorBanner
        message="Plaid did not respond."
        onAction={retry}
        onDismiss={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("clears a transaction search from its empty state", () => {
    const clearSearch = vi.fn();
    render(
      <EmptyTransactions hasSearch onClearSearch={clearSearch} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(clearSearch).toHaveBeenCalledOnce();
  });
});
