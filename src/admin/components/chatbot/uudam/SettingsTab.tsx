"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { input, type Settings } from "../types";
import { ContactInfoCard } from "./ContactInfoCard";
import { useSupportCopy } from "../supportCopy";
import { Loader2, Save } from "lucide-react";
export function SettingsTab({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const { t } = useI18n();
  const copy = useSupportCopy();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const settingsRef = useRef(settings);
  useEffect(() => { if (settingsRef.current !== settings) { settingsRef.current = settings; setDraft(settings); } }, [settings]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (saving) return; setSaving(true); setNotice(""); setFailed(false);
    try { const { data } = await api.patch("/chatbot/admin/settings", { fields: draft }); onSaved(data); setNotice(t("chatbot.saved")); }
    catch { setFailed(true); setNotice(t("chatbot.settings_error")); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="max-w-6xl space-y-5">
    <p className="max-w-3xl text-sm leading-relaxed text-taupe">{copy.settingsHint}</p>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
      <section className="border border-ink/15 bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">{copy.behavior}</h2><p className="mt-1 text-sm text-taupe">{copy.behaviorHint}</p><div className="mt-5 divide-y divide-ink/10">{(["enabled", "metaOutbound", "showExactStock"] as const).map((field) => <label key={field} className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-3 text-sm"><span>{t(`chatbot.${field}`)}</span><input type="checkbox" className="h-5 w-5 shrink-0 accent-espresso" checked={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.checked })} /></label>)}</div><label className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-ink/10 pt-5 text-sm">{t("chatbot.lowStockThreshold")}<input type="number" min={1} max={1000} step={1} required value={draft.lowStockThreshold} onChange={(e) => setDraft({ ...draft, lowStockThreshold: Number(e.target.value) })} className={`${input} max-w-32`} /></label></section>
      <aside className="border border-ink/15 bg-paper p-5 sm:p-6"><ContactInfoCard label={t("chatbot.contact_shown")} /><p className="mt-6 border-t border-ink/10 pt-5 text-sm leading-relaxed text-taupe">{t("chatbot.knowledge_hint")}</p></aside>
    </div>
    {([{ title: copy.handoff, hint: copy.handoffHint, fields: ["handoffMn", "handoffEn"] as const }, { title: copy.knowledge, hint: copy.knowledgeHint, fields: ["extraKnowledgeMn", "extraKnowledgeEn"] as const }]).map((section) => <section key={section.title} className="border border-ink/15 bg-white p-5 sm:p-6"><h2 className="text-base font-semibold">{section.title}</h2><p className="mt-1 text-sm text-taupe">{section.hint}</p><div className="mt-5 grid gap-5 md:grid-cols-2">{section.fields.map((field) => <label key={field} className="block text-sm font-medium">{t(`chatbot.${field}`)}<textarea rows={field.startsWith("extra") ? 7 : 4} maxLength={field.startsWith("extra") ? 8000 : 1000} required={!field.startsWith("extra")} value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} className={`${input} mt-2 resize-y font-normal leading-relaxed`} /></label>)}</div></section>)}
    <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border border-ink/15 bg-white p-4"><p role={failed ? "alert" : "status"} className={`text-sm ${failed ? "text-terracotta" : "text-ink"}`}>{notice}</p><button type="submit" disabled={saving} className="btn">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? copy.saving : t("chatbot.save")}</button></div>
  </form>;
}
