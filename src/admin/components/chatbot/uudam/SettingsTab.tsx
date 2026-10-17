"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { button, input, type Settings } from "../types";
import { ContactInfoCard } from "./ContactInfoCard";
export function SettingsTab({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const settingsRef = useRef(settings);
  useEffect(() => { if (settingsRef.current !== settings) { settingsRef.current = settings; setDraft(settings); } }, [settings]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (saving) return; setSaving(true); setNotice("");
    try { const { data } = await api.patch("/chatbot/admin/settings", { fields: draft }); onSaved(data); setNotice(t("chatbot.saved")); }
    catch { setNotice(t("chatbot.settings_error")); }
    finally { setSaving(false); }
  }
  return <form onSubmit={save} className="max-w-3xl space-y-6 border border-ink/10 bg-white p-5">
    <ContactInfoCard label={t("chatbot.contact_shown")} />
    {["enabled", "metaOutbound", "showExactStock"].map((field) => <label key={field} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={draft[field as "enabled"]} onChange={(e) => setDraft({ ...draft, [field]: e.target.checked })} />{t(`chatbot.${field}`)}</label>)}
    <label className="block text-sm">{t("chatbot.lowStockThreshold")}<input type="number" min={1} max={1000} required value={draft.lowStockThreshold} onChange={(e) => setDraft({ ...draft, lowStockThreshold: Number(e.target.value) })} className={`${input} mt-2 max-w-40`} /></label>
    <div className="grid gap-5 md:grid-cols-2">{(["handoffMn", "handoffEn", "extraKnowledgeMn", "extraKnowledgeEn"] as const).map((field) => <label key={field} className="block text-sm">{t(`chatbot.${field}`)}<textarea rows={field.startsWith("extra") ? 6 : 3} maxLength={field.startsWith("extra") ? 8000 : 1000} required={!field.startsWith("extra")} value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} className={`${input} mt-2`} /></label>)}</div>
    <p className="text-xs text-taupe">{t("chatbot.knowledge_hint")}</p>{notice && <p role="status" className="text-sm text-terracotta">{notice}</p>}<button disabled={saving} className={`${button} !bg-espresso text-paper`}>{t("chatbot.save")}</button>
  </form>;
}
