"use client";
import { useEffect, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { Inbox } from "./Inbox";
import { TestChat } from "./TestChat";
import { BotSettings } from "./BotSettings";
import { button, type Lead, type Settings } from "./types";

type Tab = "inbox" | "leads" | "settings" | "test" | "errors";
type ErrorRow = { id: string; code: string; source: string; createdAt: string; conversationId?: string };
export function ChatbotDashboard() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("inbox");
  const [selected, setSelected] = useState<string>();
  const [settings, setSettings] = useState<Settings>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadPage, setLeadPage] = useState(1);
  const [leadTotal, setLeadTotal] = useState(0);
  const [errors, setErrors] = useState<ErrorRow[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        if (tab === "settings") { const { data } = await api.get("/admin/chat/settings"); if (!cancelled) setSettings(data); }
        if (tab === "leads") { const { data } = await api.get(`/admin/chat/leads?page=${leadPage}`); if (!cancelled) { setLeads(data.rows); setLeadTotal(data.total); } }
        if (tab === "errors") { const { data } = await api.get("/admin/chat/errors"); if (!cancelled) setErrors(data); }
        if (!cancelled) setError("");
      } catch { if (!cancelled) setError(t("chatbot.error")); }
    }
    void load(); return () => { cancelled = true; };
  }, [token, tab, leadPage, t]);
  const updateLead = async (lead: Lead, status: string) => {
    try { const { data } = await api.patch(`/admin/chat/leads/${lead.id}`, { status }); setLeads((rows) => rows.map((row) => row.id === lead.id ? data : row)); }
    catch { setError(t("chatbot.error")); }
  };
  return <div className="space-y-6">
    <div><p className="eyebrow">Lorentz</p><h1 className="store-heading mt-2 text-4xl">{t("chatbot.title")}</h1></div>
    <nav className="flex flex-wrap gap-2" aria-label={t("chatbot.title")}>{(["inbox", "leads", "settings", "test", "errors"] as Tab[]).map((value) => <button key={value} onClick={() => setTab(value)} aria-pressed={tab === value} className={`${button} ${tab === value ? "!bg-espresso text-paper" : ""}`}>{t(`chatbot.${value}`)}</button>)}</nav>
    {error && <p role="alert" className="text-sm text-terracotta">{error}</p>}
    {token && tab === "inbox" && <Inbox selectedId={selected} onSelect={setSelected} />}
    {token && tab === "test" && <TestChat />}
    {tab === "settings" && settings && <BotSettings settings={settings} onSaved={setSettings} />}
    {tab === "leads" && <div className="overflow-x-auto border border-ink/10 bg-white"><table className="w-full text-left text-sm"><thead className="bg-sand"><tr>{["name", "phone", "question", "status", "conversation"].map((key) => <th key={key} className="p-3 font-medium">{t(`chatbot.${key}`)}</th>)}</tr></thead><tbody>{leads.map((lead) => <tr key={lead.id} className="border-t border-ink/10"><td className="p-3">{lead.name || "—"}</td><td className="p-3">{lead.phone ? <a href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}</td><td className="max-w-md whitespace-pre-wrap p-3">{lead.question}</td><td className="p-3"><select aria-label={t("chatbot.status")} value={lead.status} onChange={(e) => updateLead(lead, e.target.value)} className="border border-ink/20 p-2">{["new", "contacted", "done"].map((s) => <option key={s} value={s}>{t(`chatbot.${s}`)}</option>)}</select></td><td className="p-3"><button className={button} onClick={() => { setSelected(lead.conversationId); setTab("inbox"); }}>{t("chatbot.open")}</button></td></tr>)}</tbody></table>{!leads.length && <p className="p-4 text-sm text-taupe">{t("chatbot.no_leads")}</p>}<div className="flex gap-3 p-3"><button className={button} disabled={leadPage === 1} onClick={() => setLeadPage(leadPage - 1)}>←</button><span>{leadPage}</span><button className={button} disabled={leadPage * 50 >= leadTotal} onClick={() => setLeadPage(leadPage + 1)}>→</button></div></div>}
    {tab === "errors" && <div className="space-y-3 border border-ink/10 bg-white p-4">{!errors.length && <p className="text-sm text-taupe">{t("chatbot.no_errors")}</p>}{errors.map((e) => <div key={e.id} className="border-b border-ink/10 pb-3 text-sm"><span className="text-terracotta">{e.code}</span> · {e.source}<span className="ml-3 text-xs text-taupe">{new Date(e.createdAt).toLocaleString()}</span>{e.conversationId && <button className={`${button} ml-3`} onClick={() => { setSelected(e.conversationId); setTab("inbox"); }}>{t("chatbot.open")}</button>}</div>)}</div>}
  </div>;
}
