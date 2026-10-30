"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import type { ChatMessage } from "@/components/chatbot/ChatThread";
import { Loader2, MessageSquare, RotateCcw, Send } from "lucide-react";
import { Notice } from "@admin/components/ui/feedback";
import { ConversationTranscript } from "./ConversationTranscript";

/** Ask the assistant a question exactly as a customer would. Test chats never reach customers or reports. */
export function TestChat() {
  const { t, locale } = useI18n();
  const [id, setId] = useState<string>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "info" | "warning"; text: string } | null>(null);
  const pending = useRef<{ text: string; id: string } | null>(null);
  const submitting = useRef(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight; }, [messages]);
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!text.trim() || submitting.current) return;
    submitting.current = true;
    if (pending.current?.text !== text) pending.current = { text, id: crypto.randomUUID() };
    setBusy(true); setNotice(null);
    try {
      const { data } = await api.post("/chatbot/admin/test", { conversationId: id, text, locale, clientMessageId: pending.current.id });
      setId(data.conversationId); setMessages(data.messages); setText("");
      pending.current = null;
      if (data.paused) setNotice({ tone: "info", text: t("test.paused") });
    } catch { setNotice({ tone: "warning", text: t("test.errors.send_failed") }); }
    finally { submitting.current = false; setBusy(false); }
  };
  const reset = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try { if (id) await api.delete(`/chatbot/admin/test/${id}`); setId(undefined); setMessages([]); setNotice(null); setText(""); pending.current = null; }
    catch { setNotice({ tone: "warning", text: t("test.errors.reset_failed") }); }
    finally { submitting.current = false; setBusy(false); }
  };
  return <section className="max-w-[960px] overflow-hidden border border-ink/15 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-[12px] border-b border-ink/10 px-[16px] py-[14px] md:px-[20px]">
      <div><h2 className="text-[15px] font-semibold">{t("test.title")}</h2><p className="mt-[2px] max-w-2xl text-[13px] leading-relaxed text-taupe">{t("test.hint")}</p></div>
      <button type="button" onClick={reset} disabled={busy || (!id && !messages.length)} className="btn-secondary btn-sm"><RotateCcw aria-hidden size={14} />{t("test.reset")}</button>
    </div>
    <div ref={scroll} tabIndex={0} aria-label={t("chat.thread.messages")} className="h-[45dvh] min-h-[300px] max-h-[560px] overflow-y-auto bg-paper/70 p-[16px] sm:p-[20px]">
      {messages.length ? <ConversationTranscript messages={messages} /> : <div className="flex min-h-[250px] flex-col items-center justify-center text-center"><MessageSquare aria-hidden size={28} strokeWidth={1.3} className="mb-[14px] text-taupe" /><p className="text-[15px] font-medium">{t("test.empty_title")}</p><p className="mt-[6px] max-w-md text-[13px] leading-relaxed text-taupe">{t("test.empty_body")}</p></div>}
    </div>
    {notice && <Notice tone={notice.tone} role="status" className="border-x-0 border-b-0">{notice.text}</Notice>}
    <form onSubmit={send} className="flex flex-col gap-[8px] border-t border-ink/10 p-[12px] sm:flex-row md:p-[16px]">
      <label htmlFor="test-message" className="sr-only">{t("test.message")}</label>
      <input id="test-message" disabled={busy} placeholder={t("test.placeholder")} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} className="field" />
      <button type="submit" disabled={busy || !text.trim()} className="btn shrink-0">{busy ? <Loader2 aria-hidden size={16} className="animate-spin" /> : <Send aria-hidden size={16} />}{busy ? t("chat.sending") : t("chat.send")}</button>
    </form>
  </section>;
}
