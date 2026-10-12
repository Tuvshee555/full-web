import type { ReactNode } from "react";
import { Button, Card, Spinner, cx } from "./ui";
type StructuredRow = Record<string, string>;

/** Full-panel loading placeholder for a tab's initial data fetch. */
export function LoadingPanel() {
  return (
    <div className="flex items-center justify-center py-16">
      <Spinner className="text-terracotta" />
    </div>
  );
}

/** Page-level tab header: icon tile + title + description + actions.
    One pattern for every tab so the product reads as one system. */
export function TabHeader({
  icon,
  title,
  description,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center  bg-sand text-terracotta">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <h1 className="store-heading text-3xl text-ink">{title}</h1>
          {description && (
            <p className="mt-0.5 max-w-2xl text-sm text-taupe">{description}</p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

/** One KPI tile — uppercase micro-label over a big tabular number. */
export function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: ReactNode;
  tone?: string;
}) {
  return (
    <Card className="p-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-taupe">
        {label}
      </p>
      <p
        className={cx(
          "mt-1.5 text-[26px] font-extrabold leading-none tracking-tight tabular-nums",
          tone ?? "text-ink",
        )}
      >
        {value}
      </p>
    </Card>
  );
}

export function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-taupe">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StructuredEditor({
  title,
  addLabel,
  fields,
  rows,
  onChange,
}: {
  title: string;
  addLabel: string;
  fields: Array<{ key: string; label: string }>;
  rows: StructuredRow[];
  onChange: (rows: StructuredRow[]) => void;
}) {
  function update(index: number, key: string, value: string) {
    onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  }
  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }
  function add() {
    const blank: StructuredRow = {};
    for (const field of fields) blank[field.key] = "";
    onChange([...rows, blank]);
  }
  return (
    <div className=" border border-ink/10 bg-paper p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink">{title}</h4>
        <Button size="sm" variant="secondary" onClick={add}>
          
          {addLabel}
        </Button>
      </div>
      <div className="mt-2 space-y-2">
        {rows.length === 0 && (
          <p className="text-xs text-taupe">Хоосон байна.</p>
        )}
        {rows.map((row, index) => (
          <div
            key={index}
            className=" border border-ink/10 bg-white p-2.5"
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-xs font-medium text-taupe">
                    {field.label}
                  </span>
                  <input
                    className="mt-1 h-9 w-full  border border-ink/20 bg-white px-2.5 text-sm text-ink transition-colors focus:border-ink"
                    value={row[field.key] || ""}
                    onChange={(e) => update(index, field.key, e.target.value)}
                  />
                </label>
              ))}
            </div>
            <div className="mt-2 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => remove(index)}
                className="text-terracotta"
              >
                
                Устгах
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
