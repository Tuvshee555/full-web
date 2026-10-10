"use client";

import { useState } from "react";
import { Button } from "@admin/components/ui/button";

type Props = {
  open: boolean;
  initialValue: string;
  title: string;
  placeholder?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
};

export function RenameDialog({
  open,
  initialValue,
  title,
  placeholder,
  onCancel,
  onConfirm,
}: Props) {
  const [value, setValue] = useState(initialValue);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background rounded-none w-full max-w-sm p-4">
        <div className="text-sm font-semibold mb-3">{title}</div>

        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-border rounded-none px-3 py-2 text-sm"
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={() => {
              if (!value.trim()) return;
              onConfirm(value.trim());
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
