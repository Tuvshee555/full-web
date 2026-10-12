"use client";
import { useState } from "react";
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
  const send = async (e: React.FormEvent) => {
    e.preventDefault(); if (!text.trim()) return;
    setBusy(true); setNotice("");
    try {
      const { data } = await api.post("/admin/chat/test", { conversationId: id, text, locale, clientMessageId: crypto.randomUUID() });
      setId(data.conversationId); setMessages(data.messages); setText("");
      if (data.paused) setNotice(t("chatbot.test_paused"));
    } catch { setNotice(t("chatbot.error")); }
    finally { setBusy(false); }
  };
  const reset = async () => {
    setBusy(true);
    try { if (id) await api.delete(`/admin/chat/test/${id}`); setId(undefined); setMessages([]); setNotice(""); }
    catch { setNotice(t("chatbot.error")); }
    finally { setBusy(false); }
  };
  return <section className="max-w-3xl border border-ink/10 bg-white p-5">
    <p className="mb-4 text-sm text-taupe">{t("chatbot.test_hint")}</p>
    <div className="h-[400px] overflow-y-auto bg-paper p-4"><ChatThread messages={messages} empty={t("chatbot.test_empty")} /></div>
    {notice && <p role="status" className="mt-3 text-sm text-terracotta">{notice}</p>}
    <form onSubmit={send} className="mt-4 flex gap-3"><input aria-label={t("chatbot.message")} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} className={input} /><button disabled={busy || !text.trim()} className={button}>{t("chatbot.send")}</button></form>
    <button onClick={reset} disabled={busy} className={`${button} mt-3`}>{t("chatbot.reset")}</button>
  </section>;
}
