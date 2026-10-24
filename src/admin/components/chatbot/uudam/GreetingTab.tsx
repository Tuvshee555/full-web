"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { input, type Settings } from "../types";
import { useSupportCopy } from "../supportCopy";
import { Loader2, Save } from "lucide-react";
export function GreetingTab({ settings, onSaved }: { settings: Settings; onSaved: (s: Settings) => void }) {
  const { t } = useI18n();
  const copy = useSupportCopy();
  const [draft, setDraft] = useState({ greetingMn: settings.greetingMn, greetingEn: settings.greetingEn });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState(false);
  const settingsRef = useRef(settings);
  useEffect(() => { if (settingsRef.current !== settings) { settingsRef.current = settings; setDraft({ greetingMn: settings.greetingMn, greetingEn: settings.greetingEn }); } }, [settings]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (saving) return; setSaving(true); setNotice(""); setFailed(false);
    try { const { data } = await api.patch("/chatbot/admin/settings", { fields: draft }); onSaved(data); setNotice(t("chatbot.saved")); }
    catch { setFailed(true); setNotice(t("chatbot.settings_error")); } finally { setSaving(false); }
  }
  return <form onSubmit={save} className="max-w-6xl space-y-5"><p className="text-sm leading-relaxed text-taupe">{copy.greetingHint}</p><div className="grid gap-5 md:grid-cols-2">{(["greetingMn", "greetingEn"] as const).map((field) => <label key={field} className="block border border-ink/15 bg-white p-5 text-sm font-medium sm:p-6"><span className="mb-4 block text-xs text-taupe">{field === "greetingMn" ? copy.mn : copy.en}</span>{t(`chatbot.${field}`)}<textarea required rows={7} maxLength={1000} value={draft[field]} onChange={(e) => setDraft({ ...draft, [field]: e.target.value })} className={`${input} mt-3 resize-y font-normal leading-relaxed`} /></label>)}</div><div className="flex flex-wrap items-center justify-between gap-3 border border-ink/15 bg-white p-4"><p role={failed ? "alert" : "status"} className={`text-sm ${failed ? "text-terracotta" : "text-ink"}`}>{notice}</p><button type="submit" disabled={saving} className="btn">{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}{saving ? copy.saving : t("chatbot.save")}</button></div></form>;
}
