"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { button, input, type Settings } from "../types";
export function GreetingTab({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const { t } = useI18n();
  const [draft, setDraft] = useState({ greetingMn: settings.greetingMn, greetingEn: settings.greetingEn });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const settingsRef = useRef(settings);
  useEffect(() => { if (settingsRef.current !== settings) { settingsRef.current = settings; setDraft({ greetingMn: settings.greetingMn, greetingEn: settings.greetingEn }); } }, [settings]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (saving) return; setSaving(true); setNotice("");
    try { const { data } = await api.patch("/chatbot/admin/settings", { fields: draft }); onSaved(data); setNotice(t("chatbot.saved")); }
    catch { setNotice(t("chatbot.settings_error")); } finally { setSaving(false); }
  }
  return <form onSubmit={save} className="max-w-3xl space-y-5 border border-ink/10 bg-white p-5">{(["greetingMn", "greetingEn"] as const).map((field) => <label key={field} className="block text-sm">{t(`chatbot.${field}`)}<textarea required rows={4} maxLength={1000} value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} className={`${input} mt-2`} /></label>)}{notice && <p role="status" className="text-sm text-terracotta">{notice}</p>}<button disabled={saving} className={button}>{t("chatbot.save")}</button></form>;
}
