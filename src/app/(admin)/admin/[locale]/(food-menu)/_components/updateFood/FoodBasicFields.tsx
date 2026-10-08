"use client";

import { FoodFormState } from "@admin/type/type";
import { Input } from "@admin/components/ui/input";

type Props = {
  updatedFood: FoodFormState;
  setUpdatedFood: React.Dispatch<React.SetStateAction<FoodFormState>>;
};

export default function FoodBasicFields({ updatedFood, setUpdatedFood }: Props) {
  return (
    <div className="space-y-4">
      {/* Row 1: Name + Price */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Нэр
          </label>
          <Input
            value={updatedFood.foodName ?? ""}
            onChange={(e) =>
              setUpdatedFood((p) => ({ ...p, foodName: e.target.value }))
            }
            placeholder="Бүтээгдэхүүний нэр"
            className="h-9"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Үнэ
          </label>
          <Input
            type="number"
            value={updatedFood.price}
            onChange={(e) =>
              setUpdatedFood((p) => ({ ...p, price: e.target.value }))
            }
            placeholder="Үнэ"
            className="h-9"
          />
        </div>
      </div>

      {/* Row 2: Old price */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Хуучин үнэ
        </label>
        <Input
          type="number"
          value={updatedFood.oldPrice ?? ""}
          onChange={(e) =>
            setUpdatedFood((p) => ({ ...p, oldPrice: e.target.value }))
          }
          placeholder="Хуучин үнэ (заавал биш)"
          className="h-9"
        />
      </div>

      {/* Row 3: Description */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Тайлбар
        </label>
        <textarea
          value={updatedFood.ingredients ?? ""}
          onChange={(e) =>
            setUpdatedFood((p) => ({ ...p, ingredients: e.target.value }))
          }
          placeholder="Тайлбар / орц"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm min-h-[72px] resize-none"
        />
      </div>

      {/* Row 4: Featured */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={updatedFood.isFeatured ?? false}
          onChange={(e) =>
            setUpdatedFood((p) => ({ ...p, isFeatured: e.target.checked }))
          }
          className="h-4 w-4 rounded border-border accent-primary"
        />
        <span className="text-sm">Онцлох</span>
      </label>
    </div>
  );
}
