import { Button } from "@admin/components/ui/button";
import { Save, Trash2 } from "lucide-react";

interface Props {
  loading: boolean;
  onSave: () => void;
  onDelete: () => void;
}

export default function FoodFooterActions({ loading, onSave, onDelete }: Props) {
  return (
    <div className="flex items-center justify-between pt-2 border-t border-border mt-2">
      <Button
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
        onClick={onDelete}
        disabled={loading}
      >
        <Trash2 className="w-4 h-4" />
        Устгах
      </Button>
      <Button
        size="sm"
        className="gap-2"
        onClick={onSave}
        disabled={loading}
      >
        <Save className="w-4 h-4" />
        {loading ? "Хадгалж байна..." : "Хадгалах"}
      </Button>
    </div>
  );
}
