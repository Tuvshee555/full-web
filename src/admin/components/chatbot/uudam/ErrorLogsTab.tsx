import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Badge, Button, Card, EmptyState, Icons, Input } from "./ui";
import { LoadingPanel, SectionHeading, StatCard, TabHeader } from "./AdminShared";
import { formatDateTime } from "@admin/utils/format";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

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

const RANGES = [
  { hours: 24, label: "range_24" },
  { hours: 72, label: "range_72" },
  { hours: 168, label: "range_168" },
] as const;

const LEVEL_TONE: Record<LogLevel, "danger" | "warning" | "neutral"> = {
  error: "danger",
  warn: "warning",
  info: "neutral",
};

export function ErrorLogsTab({
  apiFetch,
}: {
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
}) {
  const { t } = useI18n();
  const [hours, setHours] = useState<number>(24);
  const [level, setLevel] = useState<"" | LogLevel>("");
  const [event, setEvent] = useState("");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(true);
  const [retentionDays, setRetentionDays] = useState(7);
  const [summary, setSummary] = useState<ErrorLogSummary[]>([]);
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const requestSequence = useRef<symbol>(Symbol());

  const load = useCallback(async () => {
    const sequence = Symbol();
    requestSequence.current = sequence;
    setLoading(true);
    try {
      const params = new URLSearchParams({ hours: String(hours), limit: "200" });
      if (level) params.set("level", level);
      if (event) params.set("event", event);
      if (search) params.set("search", search);
      const res = await apiFetch(`/api/chatbot/admin/error-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Error log request failed");
      const data = await res.json();
      if (sequence !== requestSequence.current) return;
      setConfigured(data?.configured !== false);
      setRetentionDays(typeof data?.retentionDays === "number" ? data.retentionDays : 7);
      setSummary(Array.isArray(data?.summary) ? data.summary : []);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
      setLoadError("");
    } catch {
      if (sequence === requestSequence.current) setLoadError(t("chatbot.error_logs.load_failed"));
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [apiFetch, hours, level, event, search, t]);

  useEffect(() => {
    void load();
    return () => { requestSequence.current = Symbol(); };
  }, [load]);

  const errorCount = summary.filter((s) => s.level === "error").reduce((n, s) => n + s.count, 0);
  const warnCount = summary.filter((s) => s.level === "warn").reduce((n, s) => n + s.count, 0);

  return (
    <div className="space-y-6">
      <TabHeader
        icon={<Icons.alert size={20} />}
        title={t("chatbot.errors")}
        description={t("chatbot.error_logs.description", { days: retentionDays })}
        actions={
          <Button size="sm" variant="secondary" onClick={() => void load()} disabled={loading}>
            <Icons.refresh size={14} />
            {t("refresh")}
          </Button>
        }
      />

      {loadError && <Alert tone="danger">{loadError}</Alert>}

      {!configured && (
        <Alert tone="info">
          {t("chatbot.error_logs.not_configured")}
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((range) => (
          <Button
            key={range.hours}
            size="sm"
            variant={hours === range.hours ? "primary" : "secondary"}
            onClick={() => setHours(range.hours)}
          >
            {t(`chatbot.error_logs.${range.label}`)}
          </Button>
        ))}
        <span className="mx-1 h-5 w-px bg-line" />
        {(["", "error", "warn", "info"] as const).map((value) => (
          <Button
            key={value || "all"}
            size="sm"
            variant={level === value ? "primary" : "secondary"}
            onClick={() => setLevel(value)}
          >
            {t(value ? `chatbot.error_logs.level_${value}` : "chatbot.error_logs.all_levels")}
          </Button>
        ))}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchDraft.trim());
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            placeholder={t("chatbot.error_logs.search_placeholder")}
            aria-label={t("chatbot.error_logs.search_placeholder")}
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
          />
        </div>
        <Button type="submit" size="md" variant="secondary">
          <Icons.search size={14} />
          {t("chatbot.search")}
        </Button>
        {(event || search) && (
          <Button
            type="button"
            size="md"
            variant="ghost"
            onClick={() => {
              setEvent("");
              setSearch("");
              setSearchDraft("");
            }}
          >
            {t("clear")}
          </Button>
        )}
      </form>

      {loading ? (
        <LoadingPanel />
      ) : loadError ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label={t("chatbot.error_logs.level_error")} value={errorCount} tone={errorCount ? "text-terracotta" : undefined} />
            <StatCard label={t("chatbot.error_logs.level_warn")} value={warnCount} tone={warnCount ? "text-terracotta" : undefined} />
            <StatCard label={t("chatbot.error_logs.event_types")} value={summary.length} />
          </div>

          <Card className="p-4">
            <SectionHeading
              title={t("chatbot.error_logs.by_event")}
              description={t("chatbot.error_logs.by_event_hint")}
            />
            {summary.length === 0 ? (
              <EmptyState
                icon={<Icons.check size={24} />}
                title={t("chatbot.error_logs.empty_title")}
                description={t("chatbot.error_logs.empty_description")}
              />
            ) : (
              <div className="mt-3 space-y-1.5">
                {summary.map((item) => (
                  <button
                    key={`${item.event}:${item.level}`}
                    type="button"
                    onClick={() => setEvent(item.event === event ? "" : item.event)}
                    className={`flex w-full items-center justify-between gap-3  border px-3 py-2 text-left text-sm transition-colors ${
                      item.event === event
                        ? "border-ink/20 bg-sand"
                        : "border-ink/10 bg-paper hover:border-ink/20"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Badge tone={LEVEL_TONE[item.level]}>{t(`chatbot.error_logs.level_${item.level}`)}</Badge>
                      <span className="truncate font-mono text-xs text-ink">{item.event}</span>
                    </span>
                    <span className="shrink-0 text-xs text-taupe">
                      <span className="font-semibold tabular-nums text-ink">{item.count}</span>
                      {" · "}
                      {formatDateTime(item.last_at)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          {rows.length > 0 && (
            <Card className="p-4">
              <SectionHeading
                title={t("chatbot.error_logs.recent_title")}
                description={t("chatbot.error_logs.recent_description", { count: rows.length })}
              />
              <div className="mt-3 space-y-2">
                {rows.map((row) => (
                  <details
                    key={row.id}
                    className=" border border-ink/10 bg-paper p-3 text-sm"
                  >
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
                      <span className="min-w-0">
                        <span className="flex flex-wrap items-center gap-2">
                          <Badge tone={LEVEL_TONE[row.level]}>{t(`chatbot.error_logs.level_${row.level}`)}</Badge>
                          <span className="truncate font-mono text-xs text-ink">{row.event}</span>
                        </span>
                        {row.message && (
                          <span className="mt-1 block truncate text-xs text-taupe">
                            {row.message}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-taupe">
                        {formatDateTime(row.created_at)}
                      </span>
                    </summary>
                    <div className="mt-2 space-y-1.5 border-t border-ink/10 pt-2 text-xs text-taupe">
                      {row.message && <p className="whitespace-pre-wrap break-words">{row.message}</p>}
                      {row.request_id && (
                        <p>
                          {t("chatbot.error_logs.request")}: <span className="font-mono">{row.request_id}</span>
                        </p>
                      )}
                      {row.sender_hash && (
                        <p>
                          {t("chatbot.error_logs.sender")}: <span className="font-mono">{row.sender_hash}</span>
                        </p>
                      )}
                      <pre className="max-h-64 overflow-auto  bg-white p-2 text-[11px] leading-relaxed text-ink">
                        {JSON.stringify(row.fields, null, 2)}
                      </pre>
                    </div>
                  </details>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
