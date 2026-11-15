"use client";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@admin/lib/api";
import { useAdminNav } from "@admin/lib/adminNav";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { AdminTabs } from "@admin/components/ui/AdminTabs";
import { PageHeader } from "@admin/components/ui/page";
import { Segmented } from "@admin/components/ui/controls";
import { ErrorState, LoadingRows, Notice } from "@admin/components/ui/feedback";
import { cn } from "@admin/lib/utils";
import { AssistantSettings } from "./AssistantSettings";
import { ChatbotOverview } from "./ChatbotOverview";
import { Inbox, type Filter } from "./Inbox";
import { Requests } from "./Requests";
import { KnowledgeTab } from "./KnowledgeTab";
import { TestChat } from "./TestChat";
import { AuditTab } from "./AuditTab";
import { AnalyticsTab } from "./uudam/AnalyticsTab";
import { ErrorLogsTab } from "./uudam/ErrorLogsTab";
import { type Settings } from "./types";

/** The six areas of the AI Chatbot section, plus the test chat and the technical log. */
type Tab = "overview" | "conversations" | "knowledge" | "settings" | "analytics" | "activity" | "test" | "log";
const TABS: Tab[] = ["overview", "conversations", "knowledge", "settings", "analytics", "activity", "test", "log"];

/** The one master switch: saves immediately, says what it does. */
function BotSwitch({ on, busy, onChange }: { on: boolean; busy: boolean; onChange: (on: boolean) => void }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-[12px] border border-ink/15 bg-white py-[6px] pl-[14px] pr-[6px]">
      <span className="flex items-center gap-[8px] text-[14px] font-medium text-ink">
        <span aria-hidden className={cn("h-[8px] w-[8px]", on ? "bg-[#5b6b4b]" : "bg-terracotta")} />
        {t(on ? "assistant.status_on" : "assistant.status_off")}
      </span>
      <button type="button" disabled={busy} onClick={() => onChange(!on)} className={on ? "btn-secondary btn-sm" : "btn btn-sm"}>
        {busy && <Loader2 aria-hidden className="h-[14px] w-[14px] animate-spin" />}
        {t(on ? "assistant.turn_off" : "assistant.turn_on")}
      </button>
    </div>
  );
}

export function AssistantDashboard() {
  const { t } = useI18n();
  const { setParams, setBot, summary, refreshSummary } = useAdminNav();
  const params = useSearchParams();
  const requested = params?.get("tab") ?? "";
  // Older links ("Chat" page: ?chat=…, ?tab=requests) land on the conversations area.
  const tab: Tab = TABS.includes(requested as Tab) ? (requested as Tab) : requested === "requests" || params?.get("chat") || params?.get("filter") ? "conversations" : "overview";
  const sub: "chats" | "requests" = params?.get("sub") === "requests" || requested === "requests" ? "requests" : "chats";
  const chatId = params?.get("chat") ?? undefined;
  const initialFilter: Filter = params?.get("filter") === "attention" ? "attention" : "all";
  const [settings, setSettings] = useState<Settings>();
  const [system, setSystem] = useState<{ aiConfigured: boolean; defaultModel?: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [switching, setSwitching] = useState(false);
  const bot = summary.bot;

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const [{ data }, systemCheck] = await Promise.all([api.get("/chatbot/admin/settings", { signal }), api.get("/chatbot/admin/system", { signal }).catch(() => null)]);
      if (signal?.aborted) return;
      setSettings(data);
      if (systemCheck?.data) setSystem({ aiConfigured: systemCheck.data.aiConfigured !== false, defaultModel: systemCheck.data.defaultModel });
      setError(false);
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const saved = (next: Settings) => {
    setSettings(next);
    setBot({ enabled: Boolean(next.enabled), metaOutbound: Boolean(next.metaOutbound) });
  };

  const setEnabled = async (enabled: boolean) => {
    if (switching) return;
    setSwitching(true);
    try {
      const { data } = await api.patch("/chatbot/admin/settings", { fields: { enabled } });
      saved(data);
      toast.success(t(enabled ? "assistant.toast.turned_on" : "assistant.toast.turned_off"));
    } catch {
      toast.error(t("assistant.toast.switch_failed"));
    } finally {
      setSwitching(false);
    }
  };

  const enabled = settings ? settings.enabled : bot?.enabled ?? true;
  const openTab = (id: Tab, extra: Record<string, string | null> = {}) => setParams({ tab: id === "overview" ? null : id, sub: null, chat: null, filter: null, ...extra });

  return (
    <div className="w-full">
      <PageHeader
        title={t("assistant.title")}
        description={t("assistant.description")}
        actions={(settings || bot) && <BotSwitch on={enabled} busy={switching} onChange={(on) => void setEnabled(on)} />}
      />

      {!enabled && (
        <Notice tone="warning" role="status" className="mb-[16px]" title={t("chat.bot_off.title")}>
          {t("chat.bot_off.body")}
        </Notice>
      )}

      <AdminTabs
        label={t("assistant.title")}
        value={tab}
        onChange={(id) => openTab(id as Tab)}
        tabs={TABS.map((id) => ({ id, label: t(`assistant.tabs.${id}`), ...(id === "conversations" && summary.chatsNeedingYou + summary.newRequests > 0 ? { count: summary.chatsNeedingYou + summary.newRequests, urgent: true } : {}) }))}
      />

      {tab === "overview" && <ChatbotOverview onOpen={(id, extra) => openTab(id as Tab, extra)} />}
      {tab === "conversations" && (
        <div className="space-y-[12px]">
          <Segmented
            label={t("chat.title")}
            value={sub}
            onChange={(value) => setParams({ sub: value === "chats" ? null : value, chat: null, filter: null })}
            options={[
              { value: "chats", label: `${t("chat.tabs.chats")}${summary.chatsNeedingYou ? ` (${summary.chatsNeedingYou})` : ""}` },
              { value: "requests", label: `${t("chat.tabs.requests")}${summary.newRequests ? ` (${summary.newRequests})` : ""}` },
            ]}
          />
          {sub === "chats" ? (
            <Inbox
              selectedId={chatId}
              onSelect={(id) => setParams({ chat: id ?? null })}
              bot={bot}
              onChanged={refreshSummary}
              onOpenSettings={() => openTab("settings")}
              initialFilter={initialFilter}
            />
          ) : (
            <Requests onOpenChat={(id) => setParams({ sub: null, chat: id })} onChanged={refreshSummary} />
          )}
        </div>
      )}
      {tab === "knowledge" && <KnowledgeTab />}
      {tab === "settings" &&
        (loading && !settings ? (
          <div className="admin-surface"><LoadingRows rows={4} rowClassName="h-[64px]" /></div>
        ) : error && !settings ? (
          <ErrorState message={t("assistant.errors.load_failed")} onRetry={() => void load()} />
        ) : settings ? (
          <AssistantSettings settings={settings} onSaved={saved} aiConfigured={system?.aiConfigured} defaultModel={system?.defaultModel} />
        ) : null)}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "activity" && <AuditTab />}
      {tab === "test" && <TestChat />}
      {tab === "log" && <ErrorLogsTab />}
    </div>
  );
}
