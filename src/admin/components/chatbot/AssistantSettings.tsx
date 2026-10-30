"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Field, Switch } from "@admin/components/ui/controls";
import { Notice } from "@admin/components/ui/feedback";
import { Panel } from "@admin/components/ui/page";
import { cn } from "@admin/lib/utils";
import { ContactInfoCard } from "./uudam/ContactInfoCard";
import { type Settings } from "./types";

/** Only these fields are saved here; the on/off switch lives in the page header and saves at once. */
const FORM_KEYS = ["metaOutbound", "showExactStock", "lowStockThreshold", "greetingMn", "greetingEn", "handoffMn", "handoffEn", "extraKnowledgeMn", "extraKnowledgeEn"] as const;
type FormKey = (typeof FORM_KEYS)[number];
type Draft = Pick<Settings, FormKey>;
type TextKey = Exclude<FormKey, "metaOutbound" | "showExactStock" | "lowStockThreshold">;

// Must match parseSettingsFields in src/chatbot/settingsFields.ts: facts (prices, percentages, promised
// results) come from the catalogue, never from free text the assistant repeats.
const FACT_PATTERN = /₮|\bMNT\b|\d+\s*%|100%|regrow|ургуул|баталгаатай.*үр дүн/i;
const LIMIT: Record<TextKey, number> = { greetingMn: 1000, greetingEn: 1000, handoffMn: 1000, handoffEn: 1000, extraKnowledgeMn: 8000, extraKnowledgeEn: 8000 };
const REQUIRED: TextKey[] = ["greetingMn", "greetingEn", "handoffMn", "handoffEn"];

const pick = (settings: Settings): Draft => Object.fromEntries(FORM_KEYS.map((key) => [key, settings[key]])) as Draft;

export function validateAssistantDraft(draft: Draft): Partial<Record<FormKey, "required" | "too_long" | "facts" | "threshold">> {
  const errors: Partial<Record<FormKey, "required" | "too_long" | "facts" | "threshold">> = {};
  for (const key of Object.keys(LIMIT) as TextKey[]) {
    const text = draft[key] ?? "";
    if (REQUIRED.includes(key) && !text.trim()) errors[key] = "required";
    else if (text.length > LIMIT[key]) errors[key] = "too_long";
    else if (FACT_PATTERN.test(text)) errors[key] = "facts";
  }
  if (!Number.isInteger(draft.lowStockThreshold) || draft.lowStockThreshold < 1 || draft.lowStockThreshold > 1000) errors.lowStockThreshold = "threshold";
  return errors;
}

export function AssistantSettings({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState<Draft>(() => pick(settings));
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const base = useRef(pick(settings));
  // Read on every render: the saved values (a ref) can change without the draft changing.
  const dirty = FORM_KEYS.some((key) => draft[key] !== base.current[key]);

  // New settings from the server (after a save, or the header switch) only replace an untouched form.
  useEffect(() => {
    const next = pick(settings);
    const untouched = FORM_KEYS.every((key) => draft[key] === base.current[key]);
    base.current = next;
    if (untouched) setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  const errors = validateAssistantDraft(draft);
  const errorText = (key: FormKey) => {
    const code = errors[key];
    if (!showErrors || !code) return null;
    return code === "too_long" ? t("assistant.errors.too_long", { max: LIMIT[key as TextKey] }) : t(`assistant.errors.${code}`);
  };
  const set = <K extends FormKey>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (Object.keys(errors).length) {
      setShowErrors(true);
      toast.error(t("assistant.errors.fix"));
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.patch("/chatbot/admin/settings", { fields: draft });
      base.current = pick(data);
      setDraft(pick(data));
      setShowErrors(false);
      onSaved(data);
      toast.success(t("assistant.toast.saved"));
    } catch {
      toast.error(t("assistant.errors.save_failed"));
    } finally {
      setSaving(false);
    }
  };

  const textField = (key: TextKey, rows: number, optional = false) => (
    <Field
      label={t(`assistant.fields.${key}`)}
      optional={optional}
      error={errorText(key)}
      hint={t("assistant.chars", { count: (draft[key] ?? "").length, max: LIMIT[key] })}
    >
      {(props) => (
        <textarea
          {...props}
          rows={rows}
          maxLength={LIMIT[key]}
          value={draft[key]}
          onChange={(e) => set(key, e.target.value)}
          className="field resize-y"
        />
      )}
    </Field>
  );

  return (
    <form onSubmit={save} className="max-w-[1100px] space-y-[16px]" noValidate>
      <div className="grid gap-[16px] xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title={t("assistant.sections.behaviour")} description={t("assistant.sections.behaviour_hint")} bodyClassName="divide-y divide-ink/10 px-[16px] md:px-[20px]">
          <Switch
            checked={draft.metaOutbound}
            onChange={(on) => set("metaOutbound", on)}
            label={t("assistant.fields.metaOutbound")}
            description={t("assistant.fields.metaOutbound_hint")}
          />
          <Switch
            checked={draft.showExactStock}
            onChange={(on) => set("showExactStock", on)}
            label={t("assistant.fields.showExactStock")}
            description={t("assistant.fields.showExactStock_hint")}
          />
          <div className="py-[12px]">
            <Field label={t("assistant.fields.lowStockThreshold")} hint={t("assistant.fields.lowStockThreshold_hint")} error={errorText("lowStockThreshold")}>
              {(props) => (
                <input
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  step={1}
                  value={Number.isFinite(draft.lowStockThreshold) ? draft.lowStockThreshold : ""}
                  onChange={(e) => set("lowStockThreshold", e.target.value === "" ? NaN : Number(e.target.value))}
                  className="field max-w-[140px] tabular-nums"
                />
              )}
            </Field>
          </div>
        </Panel>
        <aside className="admin-surface space-y-[14px] bg-paper p-[16px] md:p-[20px]">
          <ContactInfoCard label={t("assistant.contact_shown")} />
          <p className="border-t border-ink/10 pt-[14px] text-[13px] leading-relaxed text-taupe">{t("assistant.facts_rule")}</p>
        </aside>
      </div>

      <Panel title={t("assistant.sections.greeting")} description={t("assistant.sections.greeting_hint")} bodyClassName="grid gap-[16px] p-[16px] md:grid-cols-2 md:p-[20px]">
        {textField("greetingMn", 4)}
        {textField("greetingEn", 4)}
      </Panel>

      <Panel title={t("assistant.sections.handoff")} description={t("assistant.sections.handoff_hint")} bodyClassName="grid gap-[16px] p-[16px] md:grid-cols-2 md:p-[20px]">
        {textField("handoffMn", 4)}
        {textField("handoffEn", 4)}
      </Panel>

      <Panel title={t("assistant.sections.knowledge")} description={t("assistant.sections.knowledge_hint")} bodyClassName="grid gap-[16px] p-[16px] md:grid-cols-2 md:p-[20px]">
        {textField("extraKnowledgeMn", 7, true)}
        {textField("extraKnowledgeEn", 7, true)}
      </Panel>

      {showErrors && Object.keys(errors).length > 0 && <Notice tone="warning" role="alert" title={t("assistant.errors.fix")} />}

      {/* Follows the screen only while there is something to save, so it never hides the form for nothing. */}
      <div
        className={cn("z-10 flex flex-wrap items-center justify-between gap-[12px] border border-ink/15 bg-white p-[12px]", dirty && "sticky shadow-[0_-6px_20px_rgba(28,23,20,0.08)]")}
        style={dirty ? { bottom: "calc(var(--admin-tabbar) + 8px)" } : undefined}
      >
        <p role="status" className="text-[13px] text-taupe">{dirty ? t("assistant.unsaved") : t("assistant.all_saved")}</p>
        <div className="flex flex-wrap justify-end gap-[8px]">
          <button type="button" className="btn-ghost" disabled={!dirty || saving} onClick={() => { setDraft(base.current); setShowErrors(false); }}>
            {t("assistant.discard")}
          </button>
          <button type="submit" disabled={saving || !dirty} className="btn">
            {saving ? <Loader2 aria-hidden size={16} className="animate-spin" /> : <Save aria-hidden size={16} />}
            {saving ? t("assistant.saving") : t("assistant.save")}
          </button>
        </div>
      </div>
    </form>
  );
}
