"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { FoodFormState } from "@admin/type/type";
import { Input } from "@admin/components/ui/input";

type Props = {
  updatedFood: FoodFormState;
  setUpdatedFood: React.Dispatch<React.SetStateAction<FoodFormState>>;
};

export default function FoodSizeFields({ updatedFood, setUpdatedFood }: Props) {
  const [newSize, setNewSize] = useState("");

  const addSize = () => {
    if (!newSize.trim()) return;
    setUpdatedFood((p) => ({
      ...p,
      sizes: [...(p.sizes || []), newSize.trim()],
    }));
    setNewSize("");
  };

  const removeSize = (index: number) => {
    setUpdatedFood((p) => ({
      ...p,
      sizes: p.sizes.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Хэмжээ
      </label>
      <div className="flex gap-2">
        <Input
          value={newSize}
          onChange={(e) => setNewSize(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addSize()}
          placeholder="S, M, 42..."
          className="h-9 flex-1"
        />
        <button
          type="button"
          onClick={addSize}
          className="h-9 w-9 shrink-0 rounded-md bg-primary text-primary-foreground flex items-center justify-center"
        >
          <Plus size={16} />
        </button>
      </div>
      {(updatedFood.sizes || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {(updatedFood.sizes || []).map((size, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-muted text-foreground text-xs px-2.5 py-1 rounded-full border border-border"
            >
              {size}
              <button type="button" onClick={() => removeSize(i)}>
                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
