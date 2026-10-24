"use client";

import { Button } from "@admin/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@admin/components/ui/dialog";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

type Props = {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
  busy?: boolean;
};

export function DeleteDialog({
  open,
  title,
  description,
  onCancel,
  onConfirm,
  busy = false,
}: Props) {
  const { t } = useI18n();

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onCancel(); }}>
      <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-[440px]">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            {busy ? t("editor.saving") : t("confirm_delete")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
