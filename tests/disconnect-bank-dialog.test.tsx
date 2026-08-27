import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DisconnectBankDialog } from "@/app/components/dashboard/DisconnectBankDialog";
import type { ConnectedBankGroup } from "@/types/finance";

const bank: ConnectedBankGroup = {
  itemId: "item-1",
  institutionName: "Tartan Bank",
  accounts: [
    {
      account_id: "checking-1",
      item_id: "item-1",
      institution_name: "Tartan Bank",
      name: "Everyday checking",
      type: "depository",
      subtype: "checking",
      balances: { current: 1500 },
    },
  ],
};

describe("DisconnectBankDialog", () => {
  it("names the connection, explains the impact, and focuses the safe action", async () => {
    render(
      <DisconnectBankDialog
        bank={bank}
        error={null}
        pending={false}
        onConfirm={vi.fn()}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("alertdialog", { name: "Disconnect Tartan Bank?" })).toBeVisible();
    expect(screen.getByText("Everyday checking")).toBeVisible();
    expect(screen.getByText(/transactions, and budget activity will be hidden/i)).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Keep connected" })).toHaveFocus(),
    );
  });

  it("keeps the dialog stable while pending and exposes retry after failure", () => {
    const onConfirm = vi.fn();
    const { rerender } = render(
      <DisconnectBankDialog
        bank={bank}
        error={null}
        pending
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Disconnecting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Keep connected" })).toBeDisabled();

    rerender(
      <DisconnectBankDialog
        bank={bank}
        error="Plaid could not disconnect this bank. Try again."
        pending={false}
        onConfirm={onConfirm}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Plaid could not disconnect");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });
});
