"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./dialog";

/**
 * Asks before anything that cannot be undone or that the customer will notice.
 * Says exactly what will happen; the confirm button repeats the action's name.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  confirmLabel,
  cancelLabel,
  tone = "default",
  busy,
  confirmDisabled,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  busy?: boolean;
  /** Keep the confirm button off until a required choice inside the dialog is made. */
  confirmDisabled?: boolean;
  onConfirm: () => void;
}) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <DialogContent className="sm:max-w-[460px]" onPointerDownOutside={(e) => busy && e.preventDefault()} onEscapeKeyDown={(e) => busy && e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : <DialogDescription className="sr-only">{title}</DialogDescription>}
        </DialogHeader>
        {children}
        <DialogFooter>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => onOpenChange(false)}>
            {cancelLabel ?? t("common.cancel")}
          </button>
          <button type="button" className={tone === "danger" ? "btn-danger" : "btn"} disabled={busy || confirmDisabled} onClick={onConfirm}>
            {busy && <Loader2 aria-hidden className="h-[16px] w-[16px] animate-spin" />}
            {confirmLabel}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
