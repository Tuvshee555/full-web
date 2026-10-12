"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { useAuth } from "@admin/provider/AuthProvider";
import { TestChat } from "./TestChat";
import { BotTab } from "./uudam/BotTab";
import { LeadsTab } from "./uudam/LeadsTab";
import { SettingsTab } from "./uudam/SettingsTab";
import { GreetingTab } from "./uudam/GreetingTab";
import { ErrorLogsTab } from "./uudam/ErrorLogsTab";
import { AnalyticsTab } from "./uudam/AnalyticsTab";
import { button, type Lead, type Settings } from "./types";
type Tab = "inbox" | "leads" | "settings" | "greeting" | "test" | "errors" | "analytics";
export function ChatbotDashboard() {
  const { t } = useI18n();
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("inbox");
  const [selected, setSelected] = useState<string>();
  const [settings, setSettings] = useState<Settings>();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadPage, setLeadPage] = useState(1);
  const [leadTotal, setLeadTotal] = useState(0);
  const [error, setError] = useState("");
  const apiFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data } = await api.request({ url: url.replace(/^\/api/, ""), method: init?.method || "GET", data: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  }, []);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    async function load() {
      try {
        if (tab === "settings" || tab === "greeting") { const { data } = await api.get("/chatbot/admin/settings"); if (!cancelled) setSettings(data); }
        if (tab === "leads") { const { data } = await api.get(`/chatbot/admin/leads?page=${leadPage}`); if (!cancelled) { setLeads(data.rows); setLeadTotal(data.total); } }
        if (!cancelled) setError("");
      } catch { if (!cancelled) setError(t("chatbot.error")); }
    }
    void load(); return () => { cancelled = true; };
  }, [token, tab, leadPage, t]);
  const updateLead = async (lead: Lead, status: string) => {
    try { const { data } = await api.patch("/chatbot/admin/leads", { id: lead.id, status }); setLeads((rows) => rows.map((row) => row.id === lead.id ? data : row)); }
    catch { setError(t("chatbot.error")); }
  };
  return <div className="space-y-6"><div><p className="eyebrow">Lorentz</p><h1 className="store-heading mt-2 text-4xl">{t("chatbot.title")}</h1></div><nav className="flex flex-wrap gap-2" aria-label={t("chatbot.title")}>{(["inbox", "leads", "settings", "greeting", "test", "errors", "analytics"] as Tab[]).map((value) => <button key={value} onClick={() => setTab(value)} aria-pressed={tab === value} className={`${button} ${tab === value ? "!bg-espresso text-paper" : ""}`}>{t(`chatbot.${value}`)}</button>)}</nav>{error && <p role="alert" className="text-sm text-terracotta">{error}</p>}{token && tab === "inbox" && <BotTab selectedId={selected} onSelect={setSelected} />}{token && tab === "test" && <TestChat />}{token && tab === "errors" && <ErrorLogsTab apiFetch={apiFetch} />}{token && tab === "analytics" && <AnalyticsTab />}{tab === "settings" && settings && <SettingsTab settings={settings} onSaved={setSettings} />}{tab === "greeting" && settings && <GreetingTab settings={settings} onSaved={setSettings} />}{tab === "leads" && <LeadsTab leads={leads} page={leadPage} total={leadTotal} onPage={setLeadPage} onUpdateStatus={updateLead} onOpen={(id) => { setSelected(id); setTab("inbox"); }} />}</div>;
}
