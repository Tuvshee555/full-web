"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, CircleHelp, Loader2, MessageSquare, Phone, RefreshCw, Send, StickyNote, UserRound, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { api } from "@admin/lib/api";
import { chatNeedsYou } from "@admin/lib/adminNav";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { Pagination, SearchInput, Segmented } from "@admin/components/ui/controls";
import { ErrorState, Notice } from "@admin/components/ui/feedback";
import { Dot, StatusPill } from "@admin/components/ui/status";
import { elapsed, formatWhen } from "@admin/utils/format";
import { cn } from "@admin/lib/utils";
import { type Conversation, reasonKey } from "./types";
import { ConversationTranscript } from "./ConversationTranscript";

const PAGE_SIZE = 30;
const META_CHANNELS = ["messenger", "instagram"];

export type Filter = "all" | "attention" | "taken";

export function Inbox({
  selectedId,
  onSelect,
  bot,
  onChanged,
  onOpenSettings,
  initialFilter = "all",
}: {
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  bot: { enabled: boolean; metaOutbound: boolean } | null;
  onChanged?: () => void;
  onOpenSettings: () => void;
  initialFilter?: Filter;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [thread, setThread] = useState<Conversation>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"send" | "takeover" | "notes">();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const pending = useRef(new Map<string, { text: string; id: string }>());
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const mutation = useRef(false);
  const messages = useRef<HTMLDivElement>(null);
  const composer = useRef<HTMLTextAreaElement>(null);
  const opened = useRef<string | undefined>(undefined);
  const activeThread = thread?.id === selectedId ? thread : undefined;
  const text = selectedId ? drafts[selectedId] ?? "" : "";
  const channelName = (channel: string) => t(`chat.channel.${channel}`, undefined, channel);
  const ago = (iso?: string | null) => {
    const e = elapsed(iso ?? undefined);
    if (!e) return "—";
    if (e.minutes < 1) return t("common.just_now");
    if (e.minutes < 60) return t("common.minutes_ago", { count: e.minutes });
    if (e.hours < 24) return t("common.hours_ago", { count: e.hours });
    return formatWhen(iso ?? undefined, { today: t("common.today"), yesterday: t("common.yesterday") });
  };
  const customerLabel = (c: Pick<Conversation, "customerName" | "customerPhone">) => c.customerName || c.customerPhone || "";

  // The search box waits for a pause in typing before it asks the server.
  useEffect(() => { const timer = setTimeout(() => { setQuery(search.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [search]);

  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = ++sequence.current;
    setRefreshing(true);
    try {
      const [list, detail] = await Promise.all([
        api.get("/chatbot/admin/conversations", { params: { page, ...(query ? { q: query } : {}), ...(filter !== "all" ? { filter } : {}) }, signal: controller.signal }),
        selectedId ? api.get(`/chatbot/admin/conversations/${selectedId}`, { signal: controller.signal }) : Promise.resolve(null),
      ]);
      if (current !== sequence.current || controller.signal.aborted) return;
      setRows(Array.isArray(list.data?.rows) ? list.data.rows.map((row: Conversation) => row.id === selectedId ? { ...row, unread: 0 } : row) : []);
      setTotal(Number(list.data?.total) || 0);
      if (detail) {
        setThread(detail.data);
        setNotes((prior) => (selectedId && prior[selectedId] === undefined ? { ...prior, [selectedId]: detail.data?.notes ?? "" } : prior));
      }
      setUpdatedAt(new Date().toISOString());
      setError("");
      // Opening a chat marks it read on the server; let the menu badge catch up once.
      if (selectedId && opened.current !== selectedId) {
        opened.current = selectedId;
        onChanged?.();
      }
    } catch {
      if (!controller.signal.aborted && current === sequence.current) setError(t("chat.errors.load_failed"));
    } finally {
      if (!controller.signal.aborted && current === sequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [page, selectedId, t, onChanged, query, filter]);

  useEffect(() => { setActionError(""); }, [selectedId]);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function poll() {
      if (stopped) return;
      if (document.visibilityState === "visible") await refresh();
      if (!stopped) timer = setTimeout(poll, 8000);
    }
    const visible = () => { if (document.visibilityState === "visible") { clearTimeout(timer); void poll(); } };
    document.addEventListener("visibilitychange", visible);
    void poll();
    return () => { stopped = true; clearTimeout(timer); request.current?.abort(); document.removeEventListener("visibilitychange", visible); };
  }, [refresh]);
  const lastMessageId = activeThread?.messages.at(-1)?.id;
  useEffect(() => {
    if (messages.current) messages.current.scrollTop = messages.current.scrollHeight;
  }, [selectedId, lastMessageId]);

  const toggle = async () => {
    if (!activeThread || mutation.current) return;
    const takingOver = !activeThread.paused;
    mutation.current = true; setBusy(true); setAction("takeover"); setActionError("");
    try {
      await api.patch(`/chatbot/admin/conversations/${activeThread.id}`, { paused: takingOver });
      await refresh();
      toast.success(t(takingOver ? "chat.toast.taken_over" : "chat.toast.given_back"));
      onChanged?.();
    }
    catch { setActionError(t("chat.errors.takeover_failed")); }
    finally { mutation.current = false; setBusy(false); setAction(undefined); }
  };
  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeThread || !text.trim() || mutation.current) return;
    mutation.current = true; setBusy(true); setAction("send"); setActionError("");
    const conversationId = activeThread.id;
    const willDeliver = !META_CHANNELS.includes(activeThread.channel) || Boolean(bot?.metaOutbound);
    if (pending.current.get(conversationId)?.text !== text) pending.current.set(conversationId, { text, id: crypto.randomUUID() });
    try {
      await api.post(`/chatbot/admin/conversations/${conversationId}/messages`, { text, clientMessageId: pending.current.get(conversationId)!.id });
      setDrafts((prior) => ({ ...prior, [conversationId]: "" }));
      pending.current.delete(conversationId);
      await refresh();
      if (willDeliver) toast.success(t("chat.toast.sent"));
      else toast.warning(t("chat.toast.saved_not_sent"));
      onChanged?.();
    }
    catch { setActionError(t("chat.errors.reply_failed")); }
    finally { mutation.current = false; setBusy(false); setAction(undefined); }
  };
  const saveNotes = async () => {
    if (!activeThread || mutation.current) return;
    mutation.current = true; setBusy(true); setAction("notes"); setActionError("");
    try {
      await api.patch(`/chatbot/admin/conversations/${activeThread.id}`, { notes: notes[activeThread.id] ?? "" });
      setThread((prior) => (prior && prior.id === activeThread.id ? { ...prior, notes: notes[activeThread.id] ?? "" } : prior));
      toast.success(t("chat.notes_saved"));
    }
    catch { setActionError(t("chat.errors.notes_failed")); }
    finally { mutation.current = false; setBusy(false); setAction(undefined); }
  };

  const needingYou = rows.filter(chatNeedsYou).length;
  const metaBlocked = Boolean(activeThread && META_CHANNELS.includes(activeThread.channel) && bot && !bot.metaOutbound);
  const showList = !selectedId;
  const noteDirty = Boolean(activeThread) && (notes[activeThread!.id] ?? "") !== (activeThread!.notes ?? "");

  return <section className="space-y-[12px]">
    {offline && <Notice tone="warning" role="status"><span className="inline-flex items-center gap-[8px]"><WifiOff aria-hidden size={16} className="shrink-0" />{t("chat.offline")}</span></Notice>}
    {error && <ErrorState message={`${error} ${t("chat.errors.draft_kept")}`} onRetry={() => void refresh()} retrying={refreshing} />}
    <div className="grid overflow-hidden border border-ink/15 bg-white lg:min-h-[620px] lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
      {/* Conversation list */}
      <div className={cn("min-w-0 flex-col lg:flex lg:border-r lg:border-ink/15", showList ? "flex" : "hidden")}>
        <div className="space-y-[10px] border-b border-ink/10 p-[12px] lg:p-[16px]">
          <div className="flex flex-wrap items-center justify-between gap-[8px]">
            <Segmented
              label={t("chat.filter_label")}
              value={filter}
              onChange={(value) => { setFilter(value); setPage(1); }}
              options={[{ value: "all", label: t("chat.filter.all") }, { value: "attention", label: t("chat.filter.attention"), count: filter === "all" ? needingYou : undefined }, { value: "taken", label: t("chat.filter.taken") }]}
            />
            <button type="button" aria-label={t("chat.refresh")} title={updatedAt ? t("chat.updated_at", { time: formatWhen(updatedAt, { today: t("common.today"), yesterday: t("common.yesterday") }) }) : t("chat.refresh")} disabled={refreshing || busy} className="btn-ghost btn-sm" onClick={() => void refresh()}>
              <RefreshCw aria-hidden size={15} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
          <SearchInput value={search} onChange={setSearch} placeholder={t("chat.search_hint")} label={t("chat.search_label")} />
          {total > PAGE_SIZE && <p className="text-[12px] text-taupe">{t("chat.page_note")}</p>}
        </div>
        <div className="max-h-[65dvh] flex-1 overflow-y-auto lg:max-h-[620px]">
          {loading && !rows.length ? (
            <div role="status" className="flex items-center gap-3 p-6 text-sm text-taupe"><Loader2 aria-hidden size={18} className="animate-spin" />{t("common.loading")}</div>
          ) : !rows.length && !error ? (
            <div className="px-[20px] py-[40px] text-center">
              <MessageSquare aria-hidden size={26} strokeWidth={1.4} className="mx-auto mb-[12px] text-taupe" />
              <p className="text-[14px] font-medium">{t(query || filter !== "all" ? "chat.empty.no_match" : "chat.empty.none")}</p>
              <p className="mx-auto mt-[6px] max-w-[34ch] text-[13px] leading-relaxed text-taupe">{t(query || filter !== "all" ? (filter === "attention" && !query ? "chat.empty.all_done" : "chat.empty.no_match_hint") : "chat.empty.none_hint")}</p>
            </div>
          ) : null}
          <ul>
            {rows.map((c) => {
              const last = c.messages[0];
              const needs = chatNeedsYou(c);
              const who = customerLabel(c);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={busy}
                    aria-current={selectedId === c.id ? "true" : undefined}
                    onClick={() => onSelect(c.id)}
                    className={cn("block w-full border-b border-l-[3px] border-b-ink/10 px-[14px] py-[12px] text-left transition-colors disabled:opacity-60", selectedId === c.id ? "border-l-espresso bg-sand/70" : "border-l-transparent hover:bg-paper")}
                  >
                    <span className="flex items-center justify-between gap-[8px]">
                      <span className="flex min-w-0 items-center gap-[6px] text-[14px] font-semibold">
                        {needs && <Dot label={t("chat.needs_you")} />}
                        <span className="truncate">{who || channelName(c.channel)}</span>
                        <span className="font-normal text-taupe">{who ? `· ${channelName(c.channel)}` : `#${c.id.slice(-6)}`}</span>
                      </span>
                      <span className="shrink-0 text-[12px] tabular-nums text-taupe">{ago(c.updatedAt)}</span>
                    </span>
                    <span className="mt-[4px] line-clamp-2 text-[13px] leading-relaxed text-ink">
                      {last ? <>{last.role !== "customer" && <span className="text-taupe">{t(last.role === "human" ? "chat.preview.you" : "chat.preview.assistant")} </span>}{last.text}</> : "—"}
                    </span>
                    <span className="mt-[6px] flex flex-wrap items-center gap-[6px]">
                      {c.unread > 0 && <StatusPill tone="attention" icon={null}>{t("chat.unread", { count: c.unread })}</StatusPill>}
                      {c.needsHuman && !c.paused && <StatusPill tone="attention">{t(reasonKey(c.handoffReason))}</StatusPill>}
                      {c.paused && <StatusPill tone="progress" icon={UserRound}>{t("chat.state.you")}</StatusPill>}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <Pagination page={page} pageSize={PAGE_SIZE} total={total} onPage={setPage} disabled={loading || busy} />
      </div>

      {/* Conversation */}
      <div className={cn("min-w-0 flex-col lg:flex", showList ? "hidden" : "flex")}>
        <button type="button" disabled={busy} onClick={() => onSelect(undefined)} className="flex min-h-[48px] items-center gap-2 border-b border-ink/10 px-4 text-sm lg:hidden"><ArrowLeft aria-hidden size={16} />{t("chat.back")}</button>
        {!activeThread ? (
          <div role="status" className="flex min-h-[400px] flex-1 flex-col items-center justify-center bg-paper/60 px-6 py-14 text-center">
            <span className="mb-[16px] flex h-[56px] w-[56px] items-center justify-center bg-white text-taupe">
              {selectedId && !error ? <Loader2 aria-hidden size={24} className="animate-spin" /> : error ? <CircleHelp aria-hidden size={26} strokeWidth={1.25} /> : <MessageSquare aria-hidden size={26} strokeWidth={1.25} />}
            </span>
            <h2 className="text-[18px] font-medium">{selectedId && !error ? t("chat.thread.loading") : error ? t("chat.errors.load_failed") : t("chat.thread.choose")}</h2>
            <p className="mt-[8px] max-w-md text-[14px] leading-relaxed text-taupe">{error ? t("chat.errors.draft_kept") : t("chat.thread.choose_hint")}</p>
          </div>
        ) : <>
          <div className="flex flex-wrap items-center justify-between gap-[12px] border-b border-ink/10 px-[16px] py-[12px] lg:px-[20px]">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold">{customerLabel(activeThread) || t("chat.customer_unknown")} <span className="font-normal text-taupe">· {channelName(activeThread.channel)} #{activeThread.id.slice(-6)} · {activeThread.locale.toUpperCase()}</span></h2>
              <p className="mt-[2px] flex flex-wrap items-center gap-x-[10px] gap-y-[4px] text-[13px] text-taupe">
                <span className="inline-flex items-center gap-[6px]">{activeThread.paused ? <UserRound aria-hidden size={14} /> : <Bot aria-hidden size={14} />}{t(activeThread.paused ? "chat.thread.you_handle" : bot && !bot.enabled ? "chat.thread.bot_off" : "chat.thread.bot_handles")}</span>
                {activeThread.customerPhone && <a className="inline-flex items-center gap-[4px] underline underline-offset-2" href={`tel:${activeThread.customerPhone}`}><Phone aria-hidden size={13} />{activeThread.customerPhone}</a>}
                {activeThread.needsHuman && !activeThread.paused && activeThread.handoffReason && <span>{t("chat.reason_label")}: {t(reasonKey(activeThread.handoffReason))}{activeThread.handoffAt ? ` · ${t("chat.waiting_since", { time: ago(activeThread.handoffAt) })}` : ""}</span>}
              </p>
            </div>
            <button type="button" onClick={toggle} disabled={busy || offline} className="btn-secondary btn-sm">
              {action === "takeover" && <Loader2 aria-hidden size={14} className="animate-spin" />}
              {t(activeThread.paused ? "chat.give_back" : "chat.take_over")}
            </button>
          </div>
          {activeThread.lead?.context && <p className="border-b border-ink/10 bg-paper px-[16px] py-[8px] text-[12px] leading-relaxed text-taupe lg:px-[20px]">{activeThread.lead.context}</p>}
          <div ref={messages} tabIndex={0} aria-label={t("chat.thread.messages")} className="h-[48dvh] min-h-[280px] flex-1 overflow-y-auto bg-paper/70 p-[16px] lg:max-h-[560px] lg:p-[20px]"><ConversationTranscript messages={activeThread.messages} /></div>
          <form onSubmit={send} className="space-y-[10px] border-t border-ink/10 p-[12px] lg:p-[16px]">
            {metaBlocked && (
              <Notice tone="warning" title={t("chat.meta_off.title", { channel: channelName(activeThread.channel) })} action={<button type="button" className="btn-secondary btn-sm" onClick={onOpenSettings}>{t("chat.meta_off.action")}</button>}>
                {t("chat.meta_off.body")}
              </Notice>
            )}
            {actionError && <p role="alert" className="text-[13px] font-medium text-terracotta">{actionError}</p>}
            <label htmlFor="support-reply" className="sr-only">{t("chat.reply_label")}</label>
            <div className="flex flex-col gap-[8px] sm:flex-row">
              <textarea
                ref={composer}
                id="support-reply"
                rows={2}
                maxLength={2000}
                disabled={busy || offline}
                value={text}
                onChange={(e) => setDrafts((prior) => ({ ...prior, [activeThread.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); void send(); } }}
                className="field resize-y"
                placeholder={t("chat.reply_placeholder")}
              />
              <button type="submit" disabled={busy || offline || !text.trim()} className="btn shrink-0 self-end sm:self-stretch">
                {action === "send" ? <Loader2 aria-hidden size={16} className="animate-spin" /> : <Send aria-hidden size={16} />}
                {action === "send" ? t("chat.sending") : t("chat.send")}
              </button>
            </div>
            <p className="text-[12px] leading-relaxed text-taupe">{t(activeThread.paused ? "chat.composer_hint_paused" : "chat.composer_hint")}</p>
          </form>
          <div className="border-t border-ink/10 bg-paper p-[12px] lg:p-[16px]">
            <label htmlFor="support-notes" className="mb-[6px] flex items-center gap-[6px] text-[13px] font-medium text-ink"><StickyNote aria-hidden size={14} />{t("chat.notes")}</label>
            <div className="flex flex-col gap-[8px] sm:flex-row">
              <textarea id="support-notes" rows={2} maxLength={4000} disabled={busy || offline} value={notes[activeThread.id] ?? ""} onChange={(e) => setNotes((prior) => ({ ...prior, [activeThread.id]: e.target.value }))} placeholder={t("chat.notes_placeholder")} className="field resize-y" />
              <button type="button" disabled={busy || offline || !noteDirty} className="btn-secondary shrink-0 self-end sm:self-stretch" onClick={() => void saveNotes()}>
                {action === "notes" ? <Loader2 aria-hidden size={16} className="animate-spin" /> : null}{t("chat.notes_save")}
              </button>
            </div>
          </div>
        </>}
      </div>
    </div>
  </section>;
}
