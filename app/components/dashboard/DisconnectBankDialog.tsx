"use client";

import { useRef } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Unplug } from "lucide-react";
import type { ConnectedBankGroup } from "@/types/finance";

type DisconnectBankDialogProps = {
  bank: ConnectedBankGroup | null;
  error: string | null;
  pending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function DisconnectBankDialog({
  bank,
  error,
  pending,
  onConfirm,
  onOpenChange,
}: DisconnectBankDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <AlertDialog.Root
      open={bank !== null}
      onOpenChange={(open) => {
        if (!pending) onOpenChange(open);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="disconnect-dialog-overlay" />
        <AlertDialog.Content
          className="disconnect-dialog-content"
          onEscapeKeyDown={(event) => {
            if (pending) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            cancelRef.current?.focus();
          }}
        >
          <div className="disconnect-dialog-icon" aria-hidden="true">
            <Unplug size={20} />
          </div>
          <AlertDialog.Title className="disconnect-dialog-title">
            Disconnect {bank?.institutionName ?? "this bank"}?
          </AlertDialog.Title>
          <AlertDialog.Description className="disconnect-dialog-description">
            Atama will stop refreshing this connection. Its imported accounts,
            transactions, and budget activity will be hidden from your dashboard.
          </AlertDialog.Description>

          {bank && (
            <div className="disconnect-dialog-accounts">
              <p>Affected accounts</p>
              <ul>
                {bank.accounts.map((account) => (
                  <li key={account.account_id}>
                    <span>{account.name}</span>
                    <span>{account.subtype || account.type}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="disconnect-dialog-error" role="alert">
              {error}
            </p>
          )}

          <div className="disconnect-dialog-actions">
            <AlertDialog.Cancel asChild>
              <button
                ref={cancelRef}
                type="button"
                className="button button-secondary"
                disabled={pending}
              >
                Keep connected
              </button>
            </AlertDialog.Cancel>
            <button
              type="button"
              className="button disconnect-dialog-confirm"
              disabled={pending}
              aria-busy={pending}
              onClick={onConfirm}
            >
              {pending ? "Disconnecting…" : error ? "Try again" : "Disconnect bank"}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
