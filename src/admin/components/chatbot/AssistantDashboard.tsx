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
import { ErrorState, LoadingRows, Notice } from "@admin/components/ui/feedback";
import { cn } from "@admin/lib/utils";
import { AssistantSettings } from "./AssistantSettings";
import { TestChat } from "./TestChat";
import { AnalyticsTab } from "./uudam/AnalyticsTab";
import { ErrorLogsTab } from "./uudam/ErrorLogsTab";
import { type Settings } from "./types";

type Tab = "settings" | "test" | "activity" | "log";
const TABS: Tab[] = ["settings", "test", "activity", "log"];

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
  const { setParams, setBot } = useAdminNav();
  const params = useSearchParams();
  const tab: Tab = TABS.includes(params?.get("tab") as Tab) ? (params!.get("tab") as Tab) : "settings";
  const [settings, setSettings] = useState<Settings>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [switching, setSwitching] = useState(false);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const { data } = await api.get("/chatbot/admin/settings", { signal });
      if (signal?.aborted) return;
      setSettings(data);
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

  return (
    <div className="w-full">
      <PageHeader
        title={t("assistant.title")}
        description={t("assistant.description")}
        actions={settings && <BotSwitch on={settings.enabled} busy={switching} onChange={(on) => void setEnabled(on)} />}
      />

      {settings && !settings.enabled && (
        <Notice tone="warning" role="status" className="mb-[16px]" title={t("chat.bot_off.title")}>
          {t("chat.bot_off.body")}
        </Notice>
      )}

      <AdminTabs
        label={t("assistant.title")}
        value={tab}
        onChange={(id) => setParams({ tab: id === "settings" ? null : id })}
        tabs={TABS.map((id) => ({ id, label: t(`assistant.tabs.${id}`) }))}
      />

      {tab === "settings" &&
        (loading && !settings ? (
          <div className="admin-surface"><LoadingRows rows={4} rowClassName="h-[64px]" /></div>
        ) : error && !settings ? (
          <ErrorState message={t("assistant.errors.load_failed")} onRetry={() => void load()} />
        ) : settings ? (
          <AssistantSettings settings={settings} onSaved={saved} />
        ) : null)}
      {tab === "test" && <TestChat />}
      {tab === "activity" && <AnalyticsTab />}
      {tab === "log" && <ErrorLogsTab />}
    </div>
  );
}
