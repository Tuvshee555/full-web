"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@admin/lib/api";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { ChatThread, type ChatMessage } from "@/components/chatbot/ChatThread";
import { button, input } from "./types";

export function TestChat() {
  const { t, locale } = useI18n();
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
  return <section className="max-w-3xl border border-ink/10 bg-white p-5">
    <p className="mb-4 text-sm text-taupe">{t("chatbot.test_hint")}</p>
    <div ref={scroll} className="h-[45dvh] min-h-[220px] max-h-[520px] overflow-y-auto bg-paper p-4"><ChatThread messages={messages} empty={t("chatbot.test_empty")} /></div>
    {notice && <p role="status" className="mt-3 text-sm text-terracotta">{notice}</p>}
    <form onSubmit={send} className="mt-4 flex flex-col gap-3 sm:flex-row"><input disabled={busy} aria-label={t("chatbot.message")} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} className={input} /><button type="submit" disabled={busy || !text.trim()} className={button}>{t("chatbot.send")}</button></form>
    <button onClick={reset} disabled={busy} className={`${button} mt-3`}>{t("chatbot.reset")}</button>
  </section>;
}
