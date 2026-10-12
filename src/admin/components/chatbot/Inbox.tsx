"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { ChatThread } from "@/components/chatbot/ChatThread";
import { button, input, type Conversation } from "./types";

export function Inbox({ selectedId, onSelect }: { selectedId?: string; onSelect: (id: string) => void }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<Conversation[]>([]);
  const [thread, setThread] = useState<Conversation>();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{ text: string; id: string } | null>(null);
  const refresh = useCallback(async () => {
    const { data } = await api.get(`/admin/chat/conversations?page=${page}`);
    setRows(data.rows); setTotal(data.total);
    if (selectedId) { const { data } = await api.get(`/admin/chat/conversations/${selectedId}`); setThread(data); }
  }, [page, selectedId]);
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try { await refresh(); if (!stopped) setError(""); } catch { if (!stopped) setError(t("chatbot.error")); }
      if (!stopped) timer = setTimeout(poll, 5000);
    }
    void poll();
    return () => { stopped = true; clearTimeout(timer); };
  }, [refresh, t]);
  const toggle = async () => {
    if (!thread) return; setBusy(true);
    try { await api.patch(`/admin/chat/conversations/${thread.id}`, { paused: !thread.paused }); await refresh(); }
    catch { setError(t("chatbot.error")); }
    finally { setBusy(false); }
  };
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!thread || !text.trim()) return; setBusy(true);
    if (pending.current?.text !== text) pending.current = { text, id: crypto.randomUUID() };
    try { await api.post(`/admin/chat/conversations/${thread.id}/messages`, { text, clientMessageId: pending.current.id }); setText(""); pending.current = null; await refresh(); }
    catch { setError(t("chatbot.error")); }
    finally { setBusy(false); }
  };
  return <section>
    {error && <p role="alert" className="mb-3 text-sm text-terracotta">{error}</p>}
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className="border border-ink/10 bg-white">
        {!rows.length && <p className="p-4 text-sm text-taupe">{t("chatbot.no_conversations")}</p>}
        {rows.map((c) => <button key={c.id} onClick={() => { setThread(undefined); onSelect(c.id); }} className={`block w-full border-b border-ink/10 p-4 text-left ${selectedId === c.id ? "bg-sand" : "hover:bg-paper"}`}>
          <span className="flex justify-between text-xs uppercase tracking-wide"><span>{c.channel}</span>{c.unread > 0 && <span className="text-terracotta">{c.unread} {t("chatbot.unread")}</span>}</span>
          <p className="mt-2 line-clamp-2 text-sm">{c.messages[0]?.text || "—"}</p>
          {c.needsHuman && <p className="mt-2 text-xs text-terracotta">{t("chatbot.needs_human")}</p>}
          <p className="mt-2 text-xs text-taupe">{new Date(c.updatedAt).toLocaleString()}</p>
        </button>)}
        <div className="flex items-center justify-between p-3"><button disabled={page === 1} onClick={() => setPage(page - 1)} className={button}>←</button><span className="text-xs">{page}</span><button disabled={page * 30 >= total} onClick={() => setPage(page + 1)} className={button}>→</button></div>
      </div>
      <div className="min-w-0 border border-ink/10 bg-white p-4">
        {!thread ? <p className="text-sm text-taupe">{t("chatbot.choose_conversation")}</p> : <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><span className="text-xs uppercase tracking-wide">{thread.channel} · {thread.locale}</span><button onClick={toggle} disabled={busy} className={button}>{t(thread.paused ? "chatbot.give_back" : "chatbot.take_over")}</button></div>
          <div className="h-[400px] overflow-y-auto bg-paper p-3"><ChatThread messages={thread.messages} /></div>
          <form onSubmit={send} className="mt-4 flex gap-3"><textarea aria-label={t("chatbot.human_reply")} rows={2} maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} className={input} placeholder={t("chatbot.human_reply")} /><button disabled={busy || !text.trim()} className={button}>{t("chatbot.send")}</button></form>
        </>}
      </div>
    </div>
  </section>;
}
