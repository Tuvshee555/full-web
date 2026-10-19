"use client";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { AdminTabs } from "@admin/components/ui/AdminTabs";
import { AlertCircle } from "lucide-react";
import { LoadingPanel } from "./uudam/AdminShared";
import { type Lead, type Settings } from "./types";
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
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [leadBusy, setLeadBusy] = useState<string[]>([]);
  const leadMutations = useRef(new Set<string>());
  const apiFetch = useCallback(async (url: string, init?: RequestInit) => {
    const { data } = await api.request({ url: url.replace(/^\/api/, ""), method: init?.method || "GET", signal: init?.signal ?? undefined, data: typeof init?.body === "string" ? JSON.parse(init.body) : undefined });
    return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
  }, []);
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const controller = new AbortController();
    async function load() {
      setLoading(tab === "leads" || tab === "settings" || tab === "greeting");
      try {
        if (tab === "settings" || tab === "greeting") { const { data } = await api.get("/chatbot/admin/settings", { signal: controller.signal }); if (!cancelled) setSettings(data); }
        if (tab === "leads") { const { data } = await api.get(`/chatbot/admin/leads?page=${leadPage}`, { signal: controller.signal }); if (!cancelled) { setLeads(Array.isArray(data.rows) ? data.rows : []); setLeadTotal(data.total || 0); } }
        if (!cancelled) setError("");
      } catch { if (!cancelled) setError(t("chatbot.error")); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load(); return () => { cancelled = true; controller.abort(); };
  }, [token, tab, leadPage, t, reload]);
  // The header's on/off switch needs the settings whatever tab is open
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    api.get("/chatbot/admin/settings").then(({ data }) => { if (!cancelled) setSettings(data); }).catch(() => {});
    return () => { cancelled = true; };
  }, [token]);
  const [switching, setSwitching] = useState(false);
  // Render token-gated tabs only after mount: the server never has the token, so
  // showing them during hydration made the HTML differ from the server render
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const ready = mounted && Boolean(token);
  const setEnabled = async (enabled: boolean) => {
    if (switching) return;
    setSwitching(true);
    try { const { data } = await api.patch("/chatbot/admin/settings", { fields: { enabled } }); setSettings(data); setError(""); }
    catch { setError(t("chatbot.settings_error")); }
    finally { setSwitching(false); }
  };
  const updateLead = async (lead: Lead, status: string) => {
    if (leadMutations.current.has(lead.id)) return;
    leadMutations.current.add(lead.id);
    setLeadBusy((items) => [...items, lead.id]);
    try { const { data } = await api.patch("/chatbot/admin/leads", { id: lead.id, status }); setLeads((rows) => rows.map((row) => row.id === lead.id ? data : row)); }
    catch { setError(t("chatbot.error")); }
    finally { leadMutations.current.delete(lead.id); setLeadBusy((items) => items.filter((id) => id !== lead.id)); }
  };
  return <div className="space-y-6"><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="store-heading text-[36px] md:text-[44px]">{t("chatbot.title")}</h1><p className="mt-[6px] text-[13px] text-taupe">{t("chatbot.page_hint")}</p></div>{settings && <BotSwitch on={settings.enabled} busy={switching} onChange={setEnabled} />}</div>{settings && !settings.enabled && <div role="status" className="flex items-start gap-3 border border-terracotta/30 bg-white px-4 py-3 text-sm text-ink"><AlertCircle size={18} strokeWidth={1.5} className="mt-[1px] shrink-0 text-terracotta" aria-hidden />{t("chatbot.off_notice")}</div>}<AdminTabs label={t("chatbot.title")} value={tab} onChange={(id) => setTab(id as Tab)} tabs={(["inbox", "leads", "settings", "greeting", "test", "errors", "analytics"] as Tab[]).map((value) => ({ id: value, label: t(`chatbot.${value}`) }))} />{error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-terracotta/30 bg-white p-3 text-sm text-terracotta"><p>{error}</p><button type="button" onClick={() => setReload((value) => value + 1)} className="btn-secondary">{t("retry")}</button></div>}{loading && <LoadingPanel />}{ready && tab === "inbox" && <BotTab selectedId={selected} onSelect={setSelected} />}{ready && tab === "test" && <TestChat />}{ready && tab === "errors" && <ErrorLogsTab apiFetch={apiFetch} />}{ready && tab === "analytics" && <AnalyticsTab />}{!loading && tab === "settings" && settings && <SettingsTab settings={settings} onSaved={setSettings} />}{!loading && tab === "greeting" && settings && <GreetingTab settings={settings} onSaved={setSettings} />}{!loading && tab === "leads" && !error && <LeadsTab busyIds={leadBusy} leads={leads} page={leadPage} total={leadTotal} onPage={setLeadPage} onUpdateStatus={updateLead} onOpen={(id) => { setSelected(id); setTab("inbox"); }} />}</div>;
}

/** Big, obvious on/off for the whole bot (same "enabled" flag as the Settings tab). */
function BotSwitch({ on, busy, onChange }: { on: boolean; busy: boolean; onChange: (on: boolean) => void }) {
  const { t } = useI18n();
  return <div className="flex items-center gap-3 border border-ink/10 bg-white py-2 pl-4 pr-2">
    <span className="flex items-center gap-2 text-sm text-ink"><span className={`h-2 w-2 rounded-full ${on ? "bg-[#5b6b4b]" : "bg-terracotta"}`} />{t(on ? "chatbot.status_on" : "chatbot.status_off")}</span>
    <button type="button" role="switch" aria-checked={on} disabled={busy} onClick={() => onChange(!on)} className={`min-h-[44px] px-4 text-sm font-medium transition-colors disabled:opacity-50 ${on ? "border border-ink/25 text-ink hover:border-terracotta hover:text-terracotta" : "bg-ink text-paper hover:bg-espresso"}`}>{t(on ? "chatbot.turn_off" : "chatbot.turn_on")}</button>
  </div>;
}
