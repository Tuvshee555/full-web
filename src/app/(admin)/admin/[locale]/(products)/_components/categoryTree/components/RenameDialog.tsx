"use client";

import { useEffect, useState } from "react";
import { Button } from "@admin/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@admin/components/ui/dialog";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

type Props = {
  open: boolean;
  initialValue: string;
  title: string;
  placeholder?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
  busy?: boolean;
};

export function RenameDialog({
  open,
  initialValue,
  title,
  placeholder,
  onCancel,
  onConfirm,
  busy = false,
}: Props) {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue);
  useEffect(() => { if (open) setValue(initialValue); }, [open, initialValue]);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next && !busy) onCancel(); }}>
      <DialogContent className="max-w-[calc(100vw-32px)] sm:max-w-[440px]">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{t("category.add_description")}</DialogDescription></DialogHeader>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          maxLength={100}
          aria-label={t("category.name")}
          disabled={busy}
          onKeyDown={(event) => { if (event.key === "Enter" && value.trim() && !busy) { event.preventDefault(); onConfirm(value.trim()); } }}
          className="h-11 w-full border border-border bg-white px-3 text-sm"
        />

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {t("common.cancel")}
          </Button>

          <Button
            disabled={busy || !value.trim()}
            onClick={() => {
              if (!value.trim()) return;
              onConfirm(value.trim());
            }}
          >
            {busy ? t("editor.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
