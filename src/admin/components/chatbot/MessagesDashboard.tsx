"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Settings2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@admin/lib/api";
import { useAdminNav } from "@admin/lib/adminNav";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { AdminTabs } from "@admin/components/ui/AdminTabs";
import { PageHeader } from "@admin/components/ui/page";
import { Notice } from "@admin/components/ui/feedback";
import { StatusPill } from "@admin/components/ui/status";
import { Inbox, type Filter } from "./Inbox";
import { Requests } from "./Requests";

type Tab = "chats" | "requests";

/** Daily customer work: conversations to answer and requests to call back. */
export function MessagesDashboard() {
  const { t } = useI18n();
  const { setParams, go, summary, refreshSummary, setBot } = useAdminNav();
  const params = useSearchParams();
  const tab: Tab = params?.get("tab") === "requests" ? "requests" : "chats";
  const chatId = params?.get("chat") ?? undefined;
  const initialFilter: Filter = params?.get("filter") === "attention" ? "attention" : "all";
  const [switching, setSwitching] = useState(false);
  const bot = summary.bot;

  const turnOn = async () => {
    setSwitching(true);
    try {
      const { data } = await api.patch("/chatbot/admin/settings", { fields: { enabled: true } });
      setBot({ enabled: Boolean(data?.enabled), metaOutbound: Boolean(data?.metaOutbound) });
      toast.success(t("assistant.toast.turned_on"));
    } catch {
      toast.error(t("assistant.toast.switch_failed"));
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="w-full">
      <PageHeader
        title={t("chat.title")}
        description={t("chat.description")}
        actions={
          <>
            {bot && <StatusPill tone={bot.enabled ? "success" : "attention"}>{t(bot.enabled ? "assistant.status_on" : "assistant.status_off")}</StatusPill>}
            <button type="button" className="btn-secondary" onClick={() => go("assistant")}>
              <Settings2 aria-hidden className="h-[16px] w-[16px]" strokeWidth={1.6} />
              {t("chat.assistant_settings")}
            </button>
          </>
        }
      />

      {bot && !bot.enabled && (
        <Notice
          tone="warning"
          role="status"
          className="mb-[16px]"
          title={t("chat.bot_off.title")}
          action={<button type="button" className="btn btn-sm" disabled={switching} onClick={() => void turnOn()}>{t("chat.bot_off.action")}</button>}
        >
          {t("chat.bot_off.body")}
        </Notice>
      )}

      <AdminTabs
        label={t("chat.title")}
        value={tab}
        onChange={(id) => setParams({ tab: id === "chats" ? null : id, chat: null, filter: null })}
        tabs={[
          { id: "chats", label: t("chat.tabs.chats"), count: summary.chatsNeedingYou || undefined, urgent: true },
          { id: "requests", label: t("chat.tabs.requests"), count: summary.newRequests || undefined, urgent: true },
        ]}
      />

      {tab === "chats" ? (
        <Inbox
          selectedId={chatId}
          onSelect={(id) => setParams({ chat: id ?? null })}
          bot={bot}
          onChanged={refreshSummary}
          onOpenSettings={() => go("assistant")}
          initialFilter={initialFilter}
        />
      ) : (
        <Requests onOpenChat={(id) => setParams({ tab: null, chat: id })} onChanged={refreshSummary} />
      )}
    </div>
  );
}
