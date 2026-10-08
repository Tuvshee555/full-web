// TermsDialog.tsx
"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Truck, CreditCard } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

interface TermsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export default function TermsDialog({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false,
}: TermsDialogProps) {
  const { t } = useI18n();

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (isLoading) return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg bg-card text-foreground border border-border">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {t("terms_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed">
          <div className="space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {t("terms_service")}
            </p>
            <p className="text-muted-foreground">{t("terms_service_desc")}</p>
          </div>

          <div className="space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <Truck className="h-4 w-4 text-muted-foreground" />
              {t("terms_delivery")}
            </p>
            <p className="text-muted-foreground">{t("terms_delivery_desc")}</p>
          </div>

          <div className="space-y-1">
            <p className="flex items-center gap-2 font-medium">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              {t("terms_payment")}
            </p>
            <p className="text-muted-foreground">{t("terms_payment_desc")}</p>
          </div>
        </div>

        <DialogFooter className="flex gap-3 pt-4">
          <DialogClose asChild>
            <Button variant="outline" className="h-[44px]" disabled={isLoading}>
              {t("cancel")}
            </Button>
          </DialogClose>

          <Button onClick={onConfirm} className="h-[44px]" disabled={isLoading}>
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                    strokeDasharray="60"
                  />
                </svg>
                {t("loading")}
              </span>
            ) : (
              t("continue")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
