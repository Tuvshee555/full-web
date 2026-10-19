"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { ChatThread } from "@/components/chatbot/ChatThread";
import { button, input, type Conversation } from "./types";
import { formatDateTime } from "@admin/utils/format";

export function Inbox({ selectedId, onSelect, search = "", onSearch }: { selectedId?: string; onSelect: (id: string) => void; search?: string; onSearch?: (value: string) => void }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [thread, setThread] = useState<Conversation>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
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
    try {
      const [list, detail] = await Promise.all([
        api.get("/chatbot/admin/conversations", { params: { page }, signal: controller.signal }),
        selectedId ? api.get(`/chatbot/admin/conversations/${selectedId}`, { signal: controller.signal }) : Promise.resolve(null),
      ]);
      if (current !== sequence.current || controller.signal.aborted) return;
      setRows(Array.isArray(list.data?.rows) ? list.data.rows : []);
      setTotal(Number(list.data?.total) || 0);
      if (detail) setThread(detail.data);
      setError("");
    } catch {
      if (!controller.signal.aborted && current === sequence.current) setError(t("chatbot.error"));
    } finally {
      if (!controller.signal.aborted && current === sequence.current) setLoading(false);
    }
  }, [page, selectedId, t]);
  useEffect(() => { if (selectedId) setShowList(false); }, [selectedId]);
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
    mutation.current = true; setBusy(true);
    try { await api.patch(`/chatbot/admin/conversations/${activeThread.id}`, { paused: !activeThread.paused }); await refresh(); }
    catch { setError(t("chatbot.error")); }
    finally { mutation.current = false; setBusy(false); }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || !text.trim() || mutation.current) return;
    mutation.current = true; setBusy(true);
    const conversationId = activeThread.id;
    if (pending.current.get(conversationId)?.text !== text) pending.current.set(conversationId, { text, id: crypto.randomUUID() });
    try {
      await api.post(`/chatbot/admin/conversations/${conversationId}/messages`, { text, clientMessageId: pending.current.get(conversationId)!.id });
      setDrafts((prior) => ({ ...prior, [conversationId]: "" }));
      pending.current.delete(conversationId);
      await refresh();
    }
    catch { setError(t("chatbot.error")); }
    finally { mutation.current = false; setBusy(false); }
  };
  const filtered = rows.filter((conversation) => !search || `${conversation.channel} ${conversation.messages[0]?.text || ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <section>
    {error && <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-3 border border-terracotta/30 bg-white p-3 text-sm text-terracotta"><p>{error}</p><button type="button" className={button} onClick={() => void refresh()}>{t("retry")}</button></div>}
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className={`${showList ? "" : "hidden lg:block"} self-start border border-ink/10 bg-white`}>
        {onSearch && <div className="border-b border-ink/10 p-3"><input type="search" aria-label={t("chatbot.search_page")} placeholder={t("chatbot.search_page")} value={search} onChange={(e) => onSearch(e.target.value)} className={input} /></div>}
        {loading && !rows.length ? <p role="status" className="p-4 text-sm text-taupe">{t("common.loading")}</p> : !filtered.length && !error && <p className="p-4 text-sm text-taupe">{t(search ? "chatbot.no_matches" : "chatbot.no_conversations")}</p>}
        <div className="max-h-[65dvh] overflow-y-auto">
        {filtered.map((c) => <button type="button" key={c.id} disabled={busy} aria-pressed={selectedId === c.id} onClick={() => { setShowList(false); onSelect(c.id); }} className={`block w-full border-b border-ink/10 p-4 text-left disabled:opacity-60 ${selectedId === c.id ? "bg-sand" : "hover:bg-paper"}`}>
          <span className="flex justify-between text-xs uppercase tracking-wide"><span>{c.channel}</span>{c.unread > 0 && <span className="text-terracotta">{c.unread} {t("chatbot.unread")}</span>}</span>
          <p className="mt-2 line-clamp-2 text-sm">{c.messages[0]?.text || "—"}</p>
          {c.needsHuman && <p className="mt-2 text-xs text-terracotta">{t("chatbot.needs_human")}</p>}
          <p className="mt-2 text-xs text-taupe">{formatDateTime(c.updatedAt)}</p>
        </button>)}
        </div>
        <div className="flex items-center justify-between p-3"><button type="button" aria-label={t("previous")} disabled={loading || busy || page === 1} onClick={() => setPage(page - 1)} className={button}>←</button><span className="text-xs">{t("page_of", { page, total: Math.max(1, Math.ceil(total / 30)) })}</span><button type="button" aria-label={t("next")} disabled={loading || busy || page * 30 >= total} onClick={() => setPage(page + 1)} className={button}>→</button></div>
      </div>
      <div className={`${showList ? "hidden lg:block" : ""} min-w-0 border border-ink/10 bg-white p-4`}>
        <button type="button" disabled={busy} onClick={() => setShowList(true)} className="mb-3 flex min-h-[44px] items-center gap-2 text-sm underline underline-offset-4 lg:hidden"><ArrowLeft size={16} />{t("chatbot.back_to_inbox")}</button>
        {!activeThread ? <p role="status" className="text-sm text-taupe">{t(selectedId && loading ? "common.loading" : "chatbot.choose_conversation")}</p> : <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs uppercase tracking-wide">{activeThread.channel} · {activeThread.locale}</span><button type="button" onClick={toggle} disabled={busy} className={button}>{t(activeThread.paused ? "chatbot.give_back" : "chatbot.take_over")}</button></div>
          <div ref={messages} className="h-[45dvh] min-h-[220px] max-h-[520px] overflow-y-auto bg-paper p-3"><ChatThread messages={activeThread.messages} deliveryLabel={(status) => t(`chatbot.delivery_${status}`)} /></div>
          <form onSubmit={send} className="mt-4 flex flex-col gap-3 sm:flex-row"><textarea aria-label={t("chatbot.human_reply")} rows={2} maxLength={2000} disabled={busy} value={text} onChange={(e) => setDrafts((prior) => ({ ...prior, [activeThread.id]: e.target.value }))} className={input} placeholder={t("chatbot.human_reply")} /><button type="submit" disabled={busy || !text.trim()} className={`${button} flex shrink-0 items-center justify-center gap-2`}>{busy && <Loader2 size={16} className="animate-spin" />}{t("chatbot.send")}</button></form>
        </>}
      </div>
    </div>
  </section>;
}
