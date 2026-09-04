"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  tone?: "danger" | "default";
  cancelLabel?: string;
}

/** A deliberately calm, app-native replacement for browser confirmation dialogs. */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  tone = "danger",
  cancelLabel = "Cancel",
}: ConfirmationDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[71] w-[min(calc(100vw-2rem),28rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[var(--quire-border)] bg-[var(--quire-surface)] p-6 text-[var(--quire-text)] shadow-[0_24px_80px_rgba(0,0,0,.28)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 sm:p-7">
          <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone === "danger" ? "bg-[var(--quire-red-soft)] text-[var(--quire-red)]" : "bg-[var(--quire-hover)] text-[var(--quire-text)]"}`}>
            <AlertTriangle className="h-5 w-5" aria-hidden="true" />
          </div>
          <Dialog.Title className="mt-5 text-xl font-semibold tracking-[-0.04em]">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-sm leading-6 text-[var(--quire-muted)]">{description}</Dialog.Description>
          <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--quire-muted)] transition-colors hover:bg-[var(--quire-hover)] hover:text-[var(--quire-text)]"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,0,0,.16)] transition-transform hover:-translate-y-px ${tone === "danger" ? "bg-[var(--quire-red)] hover:brightness-95" : "bg-[var(--quire-text)]"}`}
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
