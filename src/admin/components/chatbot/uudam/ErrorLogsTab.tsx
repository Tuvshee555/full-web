"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, RefreshCw, Search } from "lucide-react";
import { api } from "@admin/lib/api";
import { formatDateTime } from "@admin/utils/format";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Panel } from "@admin/components/ui/page";
import { Segmented } from "@admin/components/ui/controls";
import { EmptyState, ErrorState, LoadingRows, Notice } from "@admin/components/ui/feedback";
import { StatCard, StatusPill, type Tone } from "@admin/components/ui/status";
import { cn } from "@admin/lib/utils";

type LogLevel = "error" | "warn" | "info";

type ErrorLogRow = {
  id: string;
  created_at: string;
  level: LogLevel;
  event: string;
  message: string;
  request_id: string;
  correlation_id: string;
  sender_hash: string;
  fields: Record<string, unknown>;
};

type ErrorLogSummary = { event: string; level: LogLevel; count: number; last_at: string };

const RANGES = ["24", "72", "168"] as const;
const LEVEL_TONE: Record<LogLevel, Tone> = { error: "danger", warn: "attention", info: "neutral" };

/** Technical record of what went wrong in the assistant, for troubleshooting. Kept for a week. */
export function ErrorLogsTab() {
  const { t } = useI18n();
  const [hours, setHours] = useState<(typeof RANGES)[number]>("24");
  const [level, setLevel] = useState<"all" | LogLevel>("all");
  const [event, setEvent] = useState("");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [retentionDays, setRetentionDays] = useState(7);
  const [summary, setSummary] = useState<ErrorLogSummary[]>([]);
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [loadError, setLoadError] = useState(false);
  const requestSequence = useRef<symbol>(Symbol());

  const load = useCallback(async () => {
    const sequence = Symbol();
    requestSequence.current = sequence;
    setLoading(true);
    try {
      const params: Record<string, string> = { hours, limit: "200" };
      if (level !== "all") params.level = level;
      if (event) params.event = event;
      const { data } = await api.get("/chatbot/admin/error-logs", { params });
      if (sequence !== requestSequence.current) return;
      setConfigured(data?.configured !== false);
      setRetentionDays(typeof data?.retentionDays === "number" ? data.retentionDays : 7);
      setSummary(Array.isArray(data?.summary) ? data.summary : []);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setLoadError(false);
    } catch {
      if (sequence === requestSequence.current) setLoadError(true);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [hours, level, event]);

  useEffect(() => {
    void load();
    return () => { requestSequence.current = Symbol(); };
  }, [load]);

  // The API has no text search, so search runs over the loaded entries.
  const needle = search.toLocaleLowerCase();
  const visibleRows = needle ? rows.filter((row) => `${row.event} ${row.message} ${row.request_id}`.toLocaleLowerCase().includes(needle)) : rows;
  const visibleSummary = needle ? summary.filter((item) => item.event.toLocaleLowerCase().includes(needle)) : summary;
  const errorCount = visibleSummary.filter((s) => s.level === "error").reduce((n, s) => n + s.count, 0);
  const warnCount = visibleSummary.filter((s) => s.level === "warn").reduce((n, s) => n + s.count, 0);
  const filtered = Boolean(event || search);

  return (
    <div className="space-y-[16px]">
      <Notice title={t("log.intro_title")} action={<button type="button" className="btn-secondary btn-sm" onClick={() => void load()} disabled={loading}><RefreshCw aria-hidden size={14} className={loading ? "animate-spin" : ""} />{t("common.refresh")}</button>}>
        {t("log.intro", { days: retentionDays })}
      </Notice>

      {loadError && <ErrorState message={t("log.errors.load_failed")} onRetry={() => void load()} retrying={loading} />}
      {!configured && <Notice tone="warning">{t("log.not_configured")}</Notice>}

      <div className="flex flex-wrap items-center gap-[8px]">
        <Segmented label={t("log.period")} value={hours} onChange={setHours} options={RANGES.map((value) => ({ value, label: t(`log.range_${value}`) }))} />
        <Segmented label={t("log.level")} value={level} onChange={setLevel} options={(["all", "error", "warn", "info"] as const).map((value) => ({ value, label: t(`log.levels.${value}`) }))} />
      </div>

      <form
        className="flex flex-wrap items-end gap-[8px]"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchDraft.trim());
        }}
      >
        <div className="relative min-w-[220px] flex-1">
          <Search aria-hidden className="pointer-events-none absolute left-[12px] top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-taupe" strokeWidth={1.7} />
          <input
            type="search"
            className="field !pl-[38px]"
            placeholder={t("log.search")}
            aria-label={t("log.search")}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>
        <button type="submit" className="btn-secondary">{t("common.search")}</button>
        {filtered && (
          <button type="button" className="btn-ghost" onClick={() => { setEvent(""); setSearch(""); setSearchDraft(""); }}>
            {t("log.clear")}
          </button>
        )}
      </form>

      {loading && !summary.length && !rows.length ? (
        <div className="admin-surface"><LoadingRows rows={3} rowClassName="h-[48px]" /></div>
      ) : loadError ? null : (
        <>
          <div className="grid grid-cols-2 gap-[12px] sm:grid-cols-3">
            <StatCard label={t("log.levels.error")} value={errorCount} hint={t("log.errors_hint")} hintTone={errorCount ? "bad" : "muted"} />
            <StatCard label={t("log.levels.warn")} value={warnCount} hint={t("log.warnings_hint")} />
            <StatCard label={t("log.kinds")} value={visibleSummary.length} hint={t("log.kinds_hint")} />
          </div>

          <Panel title={t("log.by_kind")} description={t("log.by_kind_hint")} bodyClassName="p-[12px] md:p-[16px]">
            {visibleSummary.length === 0 ? (
              <EmptyState icon={CheckCircle2} title={t("log.empty_title")} description={t("log.empty_body")} className="py-[24px]" />
            ) : (
              <div className="space-y-[6px]">
                {visibleSummary.map((item) => (
                  <button
                    key={`${item.event}:${item.level}`}
                    type="button"
                    aria-pressed={item.event === event}
                    onClick={() => setEvent(item.event === event ? "" : item.event)}
                    className={cn("flex min-h-[44px] w-full items-center justify-between gap-[12px] border px-[12px] py-[8px] text-left text-[13px] transition-colors", item.event === event ? "border-ink bg-sand" : "border-ink/10 bg-paper hover:border-ink/30")}
                  >
                    <span className="flex min-w-0 items-center gap-[8px]">
                      <StatusPill tone={LEVEL_TONE[item.level]}>{t(`log.levels.${item.level}`)}</StatusPill>
                      <span className="truncate font-mono text-[12px] text-ink">{item.event}</span>
                    </span>
                    <span className="shrink-0 text-[12px] text-taupe">
                      {t("log.times", { count: item.count })}
                      {item.last_at ? ` · ${formatDateTime(item.last_at)}` : ""}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Panel>

          {visibleRows.length > 0 && (
            <Panel title={t("log.recent_title")} description={t("log.recent_hint", { count: visibleRows.length })} bodyClassName="space-y-[6px] p-[12px] md:p-[16px]">
              {visibleRows.map((row) => (
                <details key={row.id} className="border border-ink/10 bg-paper p-[12px] text-[13px]">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-[12px]">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-[8px]">
                        <StatusPill tone={LEVEL_TONE[row.level]}>{t(`log.levels.${row.level}`)}</StatusPill>
                        <span className="truncate font-mono text-[12px] text-ink">{row.event}</span>
                      </span>
                      {row.message && <span className="mt-[4px] block truncate text-[12px] text-taupe">{row.message}</span>}
                    </span>
                    <span className="shrink-0 text-[12px] tabular-nums text-taupe">{formatDateTime(row.created_at)}</span>
                  </summary>
                  <div className="mt-[8px] space-y-[6px] border-t border-ink/10 pt-[8px] text-[12px] text-taupe">
                    {row.message && <p className="whitespace-pre-wrap break-words">{row.message}</p>}
                    {row.request_id && <p>{t("log.request")}: <span className="font-mono">{row.request_id}</span></p>}
                    {row.sender_hash && <p>{t("log.sender")}: <span className="font-mono">{row.sender_hash}</span></p>}
                    <pre className="max-h-64 overflow-auto bg-white p-[8px] text-[11px] leading-relaxed text-ink">{JSON.stringify(row.fields, null, 2)}</pre>
                  </div>
                </details>
              ))}
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
