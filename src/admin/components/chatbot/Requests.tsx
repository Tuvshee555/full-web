"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageSquare, Phone, PhoneCall } from "lucide-react";
import { toast } from "sonner";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Pagination, Segmented } from "@admin/components/ui/controls";
import { EmptyState, ErrorState, LoadingRows } from "@admin/components/ui/feedback";
import { StatusPill, type Tone } from "@admin/components/ui/status";
import { formatWhen } from "@admin/utils/format";
import { cn } from "@admin/lib/utils";
import { type Lead } from "./types";

const PAGE_SIZE = 50;
const STATUSES = ["new", "contacted", "done"] as const;
type Status = (typeof STATUSES)[number];
const TONE: Record<Status, Tone> = { new: "attention", contacted: "progress", done: "success" };

/** Requests the assistant collected: who to call back, about what, and whether it is done. */
export function Requests({ onOpenChat, onChanged }: { onOpenChat: (conversationId: string) => void; onChanged?: () => void }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<Status | "all" | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const mutations = useRef(new Set<string>());

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const { data } = await api.get("/chatbot/admin/leads", { params: { page }, signal });
      if (signal?.aborted) return;
      const list: Lead[] = Array.isArray(data?.rows) ? data.rows : [];
      setRows(list);
      setTotal(Number(data?.total) || 0);
      // Start on the requests that still need a call, when there are any.
      setFilter((current) => current ?? (Number(data?.new_count) > 0 ? "new" : "all"));
      setError(false);
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const update = async (lead: Lead, status: Status) => {
    if (lead.status === status || mutations.current.has(lead.id)) return;
    mutations.current.add(lead.id);
    setBusyIds((ids) => [...ids, lead.id]);
    try {
      const { data } = await api.patch("/chatbot/admin/leads", { id: lead.id, status });
      setRows((list) => list.map((row) => (row.id === lead.id ? { ...row, ...data } : row)));
      toast.success(t(`requests.toast.${status}`, { name: lead.name || lead.phone || t("requests.someone") }));
      onChanged?.();
    } catch {
      toast.error(t("requests.errors.update_failed"));
    } finally {
      mutations.current.delete(lead.id);
      setBusyIds((ids) => ids.filter((id) => id !== lead.id));
    }
  };

  const active = filter ?? "all";
  const count = (status: Status) => rows.filter((row) => row.status === status).length;
  const visible = active === "all" ? rows : rows.filter((row) => row.status === active);

  return (
    <div className="space-y-[12px]">
      <div className="flex flex-wrap items-center justify-between gap-[8px]">
        <Segmented
          label={t("requests.filter_label")}
          value={active}
          onChange={setFilter}
          options={[
            { value: "new", label: t("requests.status.new"), count: count("new") },
            { value: "contacted", label: t("requests.status.contacted"), count: count("contacted") },
            { value: "done", label: t("requests.status.done"), count: count("done") },
            { value: "all", label: t("requests.filter_all"), count: rows.length },
          ]}
        />
        {total > PAGE_SIZE && <p className="text-[12px] text-taupe">{t("requests.page_note")}</p>}
      </div>

      {error && <ErrorState message={t("requests.errors.load_failed")} onRetry={() => void load()} retrying={loading} />}

      <div className="admin-surface">
        {loading && !rows.length ? (
          <LoadingRows rows={4} rowClassName="h-[72px]" />
        ) : !visible.length && !error ? (
          <EmptyState
            icon={rows.length ? MessageSquare : PhoneCall}
            title={t(rows.length ? `requests.empty.${active}` : "requests.empty.none")}
            description={t(rows.length ? "requests.empty.filtered_hint" : "requests.empty.none_hint")}
          />
        ) : (
          <ul className="divide-y divide-ink/10">
            {visible.map((lead) => {
              const busy = busyIds.includes(lead.id);
              const status = (STATUSES as readonly string[]).includes(lead.status) ? (lead.status as Status) : "new";
              return (
                <li key={lead.id} className="grid gap-[10px] px-[16px] py-[14px] md:grid-cols-[minmax(0,1fr)_auto] md:items-start md:px-[20px]">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px]">
                      <p className="text-[15px] font-medium text-ink">{lead.name || t("requests.no_name")}</p>
                      {status === "new" && <StatusPill tone={TONE.new}>{t("requests.status.new")}</StatusPill>}
                      {lead.createdAt && <span className="text-[12px] tabular-nums text-taupe">{formatWhen(lead.createdAt, { today: t("common.today"), yesterday: t("common.yesterday") })}</span>}
                    </div>
                    <p className="mt-[6px] whitespace-pre-wrap break-words text-[14px] leading-relaxed text-ink">{lead.question}</p>
                    <div className="mt-[8px] flex flex-wrap gap-[8px]">
                      {lead.phone ? (
                        <a className="btn-secondary btn-sm" href={`tel:${lead.phone}`}>
                          <Phone aria-hidden size={14} />
                          {t("requests.call", { phone: lead.phone })}
                        </a>
                      ) : (
                        <span className="text-[13px] text-taupe">{t("requests.no_phone")}</span>
                      )}
                      <button type="button" className="btn-ghost btn-sm" onClick={() => onOpenChat(lead.conversationId)}>
                        <MessageSquare aria-hidden size={14} />
                        {t("requests.open_chat")}
                      </button>
                    </div>
                  </div>
                  <div role="group" aria-label={t("requests.set_status", { name: lead.name || lead.phone || t("requests.someone") })} className="flex flex-wrap gap-[4px] md:justify-end">
                    {STATUSES.map((value) => (
                      <button
                        key={value}
                        type="button"
                        disabled={busy}
                        aria-pressed={status === value}
                        onClick={() => void update(lead, value)}
                        className={cn("min-h-[40px] border px-[12px] text-[13px] transition-colors disabled:opacity-50", status === value ? "border-ink bg-ink font-medium text-paper" : "border-ink/20 bg-white text-ink hover:border-ink/50")}
                      >
                        {t(`requests.mark.${value}`)}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} disabled={loading} />
      </div>
    </div>
  );
}
