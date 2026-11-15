"use client";
import { useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Pagination, Segmented } from "@admin/components/ui/controls";
import { EmptyState, ErrorState, LoadingRows } from "@admin/components/ui/feedback";
import { Panel } from "@admin/components/ui/page";
import { StatusPill, type Tone } from "@admin/components/ui/status";
import { formatDateTime } from "@admin/utils/format";

type Row = { id: string; actor: string; action: string; target: string | null; details: Record<string, unknown>; createdAt: string };
type Group = "all" | "settings" | "knowledge" | "handover" | "orders";
const GROUPS: Group[] = ["all", "settings", "knowledge", "handover", "orders"];
const TONE: Record<string, Tone> = { settings_updated: "neutral", faq_created: "success", faq_updated: "neutral", faq_deleted: "danger", product_facts_updated: "progress", conversation_taken_over: "attention", conversation_handed_back: "success", conversation_notes: "neutral", chat_order_created: "success", orders_expired: "waiting" };

/** One readable line per change: what it was (the translation), who, when, and the shortened details. */
function detailsText(details: Record<string, unknown>): string {
  return Object.entries(details || {}).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : typeof value === "object" && value ? JSON.stringify(value) : String(value)}`).join(" · ");
}

export function AuditTab() {
  const { t } = useI18n();
  const [group, setGroup] = useState<Group>("all");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    api.get("/chatbot/admin/audit", { params: { page, ...(group !== "all" ? { group } : {}) }, signal: controller.signal })
      .then(({ data }) => { if (controller.signal.aborted) return; setRows(Array.isArray(data?.rows) ? data.rows : []); setTotal(Number(data?.total) || 0); setPageSize(Number(data?.pageSize) || 50); setError(false); })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [group, page, reload]);
  return <div className="space-y-[16px]">
    <div className="flex flex-wrap items-center justify-between gap-[12px]">
      <p className="max-w-3xl text-[13px] leading-relaxed text-taupe">{t("audit.hint")}</p>
      <div className="flex flex-wrap items-center gap-[8px]">
        <Segmented label={t("audit.filter")} value={group} onChange={(value) => { setGroup(value); setPage(1); }} options={GROUPS.map((id) => ({ value: id, label: t(`audit.group.${id}`) }))} />
        <button type="button" disabled={loading} className="btn-secondary btn-sm" onClick={() => setReload((value) => value + 1)}><RefreshCw aria-hidden size={14} className={loading ? "animate-spin" : ""} />{t("common.refresh")}</button>
      </div>
    </div>
    <Panel title={t("audit.title")} description={t("audit.description")}>
      {loading && !rows.length ? <LoadingRows rows={5} /> : error && !rows.length ? <ErrorState message={t("audit.load_failed")} onRetry={() => setReload((value) => value + 1)} /> : rows.length === 0 ? <EmptyState icon={History} title={t("audit.empty")} description={t("audit.empty_hint")} className="py-[24px]" /> : (
        <ul className="divide-y divide-ink/10">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-[10px] px-[16px] py-[12px] md:px-[20px]">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-[8px] text-[14px] text-ink">
                  <StatusPill tone={TONE[row.action] || "neutral"}>{t(`audit.action.${row.action}`, undefined, row.action)}</StatusPill>
                  {row.target && <span className="truncate font-medium">{row.target}</span>}
                </p>
                {Object.keys(row.details || {}).length > 0 && <p className="mt-[4px] break-words text-[12px] leading-relaxed text-taupe">{detailsText(row.details)}</p>}
              </div>
              <p className="shrink-0 text-right text-[12px] text-taupe"><span className="block">{row.actor}</span><time dateTime={row.createdAt}>{formatDateTime(row.createdAt)}</time></p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
    {total > pageSize && <Pagination page={page} total={total} pageSize={pageSize} onPage={setPage} />}
  </div>;
}
