"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleHelp, Loader2, MessageSquare, RefreshCw, Search, Send, UserRound, WifiOff } from "lucide-react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { button, input, type Conversation } from "./types";
import { formatDateTime } from "@admin/utils/format";
import { useSupportCopy } from "./supportCopy";
import { ConversationTranscript } from "./ConversationTranscript";

export function Inbox({ selectedId, onSelect, search = "", onSearch }: { selectedId?: string; onSelect: (id: string) => void; search?: string; onSearch?: (value: string) => void }) {
  const { t } = useI18n();
  const copy = useSupportCopy();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [thread, setThread] = useState<Conversation>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<"send" | "takeover">();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string>();
  const [offline, setOffline] = useState(false);
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const [showList, setShowList] = useState(!selectedId);
  const pending = useRef(new Map<string, { text: string; id: string }>());
  const request = useRef<AbortController | null>(null);
  const sequence = useRef(0);
  const mutation = useRef(false);
  const messages = useRef<HTMLDivElement>(null);
  const activeThread = thread?.id === selectedId ? thread : undefined;
  const text = selectedId ? drafts[selectedId] ?? "" : "";
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = ++sequence.current;
    setRefreshing(true);
    try {
      const [list, detail] = await Promise.all([
        api.get("/chatbot/admin/conversations", { params: { page }, signal: controller.signal }),
        selectedId ? api.get(`/chatbot/admin/conversations/${selectedId}`, { signal: controller.signal }) : Promise.resolve(null),
      ]);
      if (current !== sequence.current || controller.signal.aborted) return;
      setRows(Array.isArray(list.data?.rows) ? list.data.rows.map((row: Conversation) => row.id === selectedId ? { ...row, unread: 0 } : row) : []);
      setTotal(Number(list.data?.total) || 0);
      if (detail) setThread(detail.data);
      setUpdatedAt(new Date().toISOString());
      setError("");
    } catch {
      if (!controller.signal.aborted && current === sequence.current) setError(t("chatbot.error"));
    } finally {
      if (!controller.signal.aborted && current === sequence.current) { setLoading(false); setRefreshing(false); }
    }
  }, [page, selectedId, t]);
  useEffect(() => { if (selectedId) setShowList(false); setActionError(""); }, [selectedId]);
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
    setLoading(true);
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
    mutation.current = true; setBusy(true); setAction("takeover"); setActionError("");
    try { await api.patch(`/chatbot/admin/conversations/${activeThread.id}`, { paused: !activeThread.paused }); await refresh(); }
    catch { setActionError(copy.takeoverFailed); }
    finally { mutation.current = false; setBusy(false); setAction(undefined); }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !text.trim() || mutation.current) return;
    mutation.current = true; setBusy(true); setAction("send"); setActionError("");
    const conversationId = activeThread.id;
    if (pending.current.get(conversationId)?.text !== text) pending.current.set(conversationId, { text, id: crypto.randomUUID() });
    try {
      await api.post(`/chatbot/admin/conversations/${conversationId}/messages`, { text, clientMessageId: pending.current.get(conversationId)!.id });
      setDrafts((prior) => ({ ...prior, [conversationId]: "" }));
      pending.current.delete(conversationId);
      await refresh();
    }
    catch { setActionError(copy.replyFailed); }
    finally { mutation.current = false; setBusy(false); setAction(undefined); }
  };
  const filtered = rows.filter((conversation) => (filter === "all" || conversation.needsHuman || conversation.unread > 0) && (!search.trim() || `${conversation.id} ${conversation.channel} ${conversation.messages[0]?.text || ""}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())));
  const unread = rows.reduce((sum, row) => sum + row.unread, 0);
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="max-w-2xl text-sm leading-relaxed text-taupe">{copy.inboxHint}</p>
      <div className="flex items-center gap-3"><span className="hidden text-xs text-taupe sm:block">{refreshing ? copy.refreshing : updatedAt ? `${copy.refreshed} ${formatDateTime(updatedAt)}` : ""}</span><button type="button" aria-label={copy.refresh} title={copy.refresh} disabled={refreshing || busy} className={button} onClick={() => void refresh()}><RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /></button></div>
    </div>
    {offline && <p role="status" className="flex items-center gap-2 border border-ink/15 bg-sand p-3 text-sm"><WifiOff size={18} className="shrink-0" />{copy.offline}</p>}
    {actionError && <p role="alert" className="border border-terracotta/30 bg-white p-4 text-sm text-terracotta">{actionError}</p>}
    {error && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 border border-terracotta/30 bg-white p-4 text-sm"><div><p className="font-medium text-terracotta">{copy.loadFailed}</p><p className="mt-1 text-taupe">{error} {copy.retryHint}</p></div><button type="button" disabled={refreshing} className={button} onClick={() => void refresh()}>{t("retry")}</button></div>}
    <div className="grid overflow-hidden border border-ink/15 bg-white lg:min-h-[620px] lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      <div className={`${showList ? "" : "hidden lg:flex"} flex min-w-0 flex-col lg:border-r lg:border-ink/15`}>
        <div className="space-y-4 border-b border-ink/10 p-4 lg:p-5">
          <div className="flex items-center justify-between"><h2 className="font-semibold">{t("chatbot.inbox")} <span className="ml-1 text-sm font-normal tabular-nums text-taupe">{total}</span></h2>{unread > 0 && <span title={copy.unread} className="bg-espresso px-2 py-1 text-xs tabular-nums text-paper">{unread} {t("chatbot.unread")}</span>}</div>
          {onSearch && <div className="relative"><Search size={17} aria-hidden className="pointer-events-none absolute left-3 top-3.5 text-taupe" /><input type="search" aria-label={t("chatbot.search_page")} placeholder={t("chatbot.search")} value={search} onChange={(e) => onSearch(e.target.value)} className={`${input} !pl-10`} /></div>}
          <div className="flex gap-2">{(["all", "attention"] as const).map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)} className={`min-h-10 border px-3 text-sm ${filter === value ? "border-ink bg-sand font-medium" : "border-ink/15 text-taupe hover:bg-paper"}`}>{copy[value]}</button>)}</div>
          <p className="text-xs text-taupe">{copy.currentPage}</p>
        </div>
        <div className="max-h-[60dvh] flex-1 overflow-y-auto lg:max-h-[620px]">
          {loading && !rows.length ? <div role="status" className="flex items-center gap-3 p-6 text-sm text-taupe"><Loader2 size={18} className="animate-spin" />{t("common.loading")}</div> : !filtered.length && !error && <div className="px-5 py-10"><MessageSquare size={25} strokeWidth={1.4} className="mb-4 text-taupe" /><p className="text-sm font-medium">{t(search || filter !== "all" ? "chatbot.no_matches" : "chatbot.no_conversations")}</p><p className="mt-2 text-sm leading-relaxed text-taupe">{search || filter !== "all" ? copy.noMatchesHint : copy.emptyHint}</p></div>}
          {filtered.map((c) => <button type="button" key={c.id} disabled={busy} aria-pressed={selectedId === c.id} onClick={() => { setShowList(false); onSelect(c.id); }} className={`block w-full border-b border-l-[3px] border-b-ink/10 p-4 text-left transition-colors disabled:opacity-60 lg:p-5 ${selectedId === c.id ? "border-l-espresso bg-sand/70" : "border-l-transparent hover:bg-paper"}`}>
            <span className="flex items-center justify-between gap-2"><span className="text-sm font-semibold capitalize">{c.channel}</span>{c.unread > 0 && <span className="min-w-5 rounded-full bg-espresso px-1.5 text-center text-xs leading-5 tabular-nums text-paper">{c.unread}</span>}</span>
            <span className="mt-1 block text-xs text-taupe">#{c.id.slice(-8)} · {c.locale.toUpperCase()}</span>
            <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-ink">{c.messages[0]?.text || "—"}</p>
            <span className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-taupe"><span>{formatDateTime(c.updatedAt)}</span>{c.needsHuman && <span className="font-medium text-terracotta">{t("chatbot.needs_human")}</span>}{c.paused && <UserRound size={13} aria-label={copy.takenOver} />}</span>
          </button>)}
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-ink/10 p-3"><button type="button" aria-label={t("previous")} disabled={loading || busy || page === 1} onClick={() => setPage(page - 1)} className={button}><ArrowLeft size={16} /></button><span className="text-xs text-taupe">{t("page_of", { page, total: Math.max(1, Math.ceil(total / 30)) })}</span><button type="button" aria-label={t("next")} disabled={loading || busy || page * 30 >= total} onClick={() => setPage(page + 1)} className={button}><ArrowRight size={16} /></button></div>
      </div>
      <div className={`${showList ? "hidden lg:flex" : "flex"} min-w-0 flex-col`}>
        <button type="button" disabled={busy} onClick={() => setShowList(true)} className="flex min-h-[48px] items-center gap-2 border-b border-ink/10 px-4 text-sm lg:hidden"><ArrowLeft size={16} />{t("chatbot.back_to_inbox")}</button>
        {!activeThread ? <div role="status" className="flex min-h-[430px] flex-1 flex-col items-center justify-center bg-paper/60 px-6 py-14 text-center"><span className="mb-6 flex h-16 w-16 items-center justify-center border border-ink/15 bg-white text-taupe">{selectedId && loading ? <Loader2 size={26} className="animate-spin" /> : error ? <CircleHelp size={28} strokeWidth={1.25} /> : <MessageSquare size={28} strokeWidth={1.25} />}</span><h2 className="text-xl font-medium">{selectedId && loading ? copy.loadingThread : error ? copy.loadFailed : copy.chooseTitle}</h2><p className="mt-3 max-w-md text-sm leading-relaxed text-taupe">{error ? copy.retryHint : copy.chooseHint}</p></div> : <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 px-4 py-4 lg:px-6"><div><h2 className="text-base font-semibold capitalize">{activeThread.channel} <span className="ml-1 font-normal text-taupe">#{activeThread.id.slice(-8)}</span></h2><p className="mt-1 flex items-center gap-1.5 text-xs text-taupe">{activeThread.paused ? <UserRound size={13} /> : <Check size={13} />} {activeThread.paused ? copy.takenOver : copy.automated} · {activeThread.locale.toUpperCase()}</p></div><button type="button" onClick={toggle} disabled={busy || offline} className={`${button} inline-flex items-center gap-2`}>{action === "takeover" && <Loader2 size={15} className="animate-spin" />}{action === "takeover" ? copy.updating : t(activeThread.paused ? "chatbot.give_back" : "chatbot.take_over")}</button></div>
          <div ref={messages} className="h-[45dvh] min-h-[280px] flex-1 overflow-y-auto bg-paper/70 p-4 lg:max-h-[600px] lg:p-6"><ConversationTranscript messages={activeThread.messages} /></div>
          <form onSubmit={send} className="border-t border-ink/10 p-4 lg:p-5"><label htmlFor="support-reply" className="mb-2 block text-sm font-medium">{t("chatbot.human_reply")}</label><div className="flex flex-col gap-3 sm:flex-row"><textarea id="support-reply" rows={2} maxLength={2000} disabled={busy || offline} value={text} onChange={(e) => setDrafts((prior) => ({ ...prior, [activeThread.id]: e.target.value }))} className={`${input} resize-y`} placeholder={copy.messageHint} /><button type="submit" disabled={busy || offline || !text.trim()} className="btn shrink-0 self-end !px-5 sm:self-stretch">{action === "send" ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{action === "send" ? copy.sending : t("chatbot.send")}</button></div><p className="mt-3 text-xs leading-relaxed text-taupe">{copy.composerHint}</p></form>
        </>}
      </div>
    </div>
  </section>;
}
