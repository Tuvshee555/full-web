"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function Field({
  label,
  value,
  onChange,
  onBlur,
  required,
  error,
  helper,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: boolean;
  helper?: string;
}) {
  return (
    <div>
      <label
        className={`text-xs font-medium uppercase tracking-wide ${
          error ? "text-red-500" : "text-muted-foreground"
        }`}
      >
        {label}
        {required && " *"}
      </label>

      <Input
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className={`
          mt-1 h-[44px]
          ${error ? "border-red-500 focus-visible:ring-red-500" : ""}
        `}
      />

      {error && helper && <p className="mt-1 text-xs text-red-500">{helper}</p>}
    </div>
  );
}

export function TextareaField({
  label,
  value,
  onChange,
  onBlur,
  required,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  required?: boolean;
  error?: boolean;
}) {
  return (
    <div>
      <label
        className={`text-xs font-medium uppercase tracking-wide ${
          error ? "text-red-500" : "text-muted-foreground"
        }`}
      >
        {label}
        {required && " *"}
      </label>

      <Textarea
        value={value}
        onBlur={onBlur}
        onChange={(e) => onChange(e.target.value)}
        className={`
          mt-1 h-[96px]
          ${error ? "border-red-500 focus-visible:ring-red-500" : ""}
        `}
      />
    </div>
  );
}
