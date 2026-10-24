"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import type { ChatMessage } from "@/components/chatbot/ChatThread";
import { button, input } from "./types";
import { Loader2, MessageSquare, RotateCcw, Send } from "lucide-react";
import { useSupportCopy } from "./supportCopy";
import { ConversationTranscript } from "./ConversationTranscript";

export function TestChat() {
  const { t, locale } = useI18n();
  const copy = useSupportCopy();
  const [id, setId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<{ text: string; id: string } | null>(null);
  const submitting = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!text.trim() || submitting.current) return;
    submitting.current = true;
    if (pending.current?.text !== text) pending.current = { text, id: crypto.randomUUID() };
    setBusy(true); setNotice("");
    try {
      const { data } = await api.post("/chatbot/admin/test", { conversationId: id, text, locale, clientMessageId: pending.current.id });
      setId(data.conversationId); setMessages(data.messages); setText("");
      pending.current = null;
      if (data.paused) setNotice(t("chatbot.test_paused"));
    } catch { setNotice(t("chatbot.error")); }
    finally { submitting.current = false; setBusy(false); }
  };
  const reset = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try { if (id) await api.delete(`/chatbot/admin/test/${id}`); setId(undefined); setMessages([]); setNotice(""); setText(""); pending.current = null; }
    catch { setNotice(t("chatbot.error")); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <section className="max-w-5xl overflow-hidden border border-ink/15 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-5"><div><h2 className="text-base font-semibold">{copy.testTitle}</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-taupe">{t("chatbot.test_hint")}</p></div><button type="button" onClick={reset} disabled={busy} className={`${button} inline-flex items-center gap-2`}><RotateCcw size={15} />{t("chatbot.reset")}</button></div>
    <div ref={scroll} className="h-[45dvh] min-h-[300px] max-h-[560px] overflow-y-auto bg-paper/70 p-5 sm:p-6">{messages.length ? <ConversationTranscript messages={messages} /> : <div className="flex min-h-[250px] flex-col items-center justify-center text-center"><MessageSquare size={30} strokeWidth={1.3} className="mb-5 text-taupe" /><p className="text-base font-medium">{copy.testEmpty}</p><p className="mt-2 max-w-md text-sm leading-relaxed text-taupe">{copy.testHint}</p></div>}</div>
    {notice && <p role="status" className="border-t border-ink/10 px-5 py-3 text-sm text-terracotta">{notice}</p>}
    <form onSubmit={send} className="flex flex-col gap-3 border-t border-ink/10 p-5 sm:flex-row"><input disabled={busy} aria-label={t("chatbot.message")} placeholder={t("chatbot.test_empty")} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} className={input} /><button type="submit" disabled={busy || !text.trim()} className="btn shrink-0">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{busy ? copy.sending : t("chatbot.send")}</button></form>
  </section>;
}
