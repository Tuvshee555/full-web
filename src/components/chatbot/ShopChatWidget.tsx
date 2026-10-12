"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { STORE } from "@/config/store";
import { API_BASE_URL } from "@/lib/api";
import { ChatThread, type ChatMessage } from "./ChatThread";

type Session = { conversationId: string; token: string };
const STORAGE = "lorentz-chat-session-v1";

export function ShopChatWidget() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paused, setPaused] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const pending = useRef<{ text: string; id: string } | null>(null);
  const request = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(`${API_BASE_URL}/chat${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw Object.assign(new Error("CHAT_ERROR"), { status: res.status });
    return res.json();
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function initialize() {
      setBusy(true);
      try {
        let stored: Session | null = null;
        try {
          const raw = localStorage.getItem(STORAGE);
          const value = raw ? JSON.parse(raw) : null;
          if (typeof value?.conversationId === "string" && typeof value?.token === "string") stored = value;
        } catch { /* restricted storage still permits an in-memory session */ }
        if (stored) {
          try {
            const data = await request(`/conversations/${stored.conversationId}`, { headers: { "X-Chat-Token": stored.token } });
            if (!cancelled) { setSession(stored); setMessages(data.messages); setPaused(data.paused); setError(""); }
            return;
          } catch (err) { if ((err as { status?: number }).status !== 404) throw err; }
        }
        const data = await request("/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
        if (cancelled) return;
        const value = { conversationId: data.conversationId, token: data.token };
        setSession(value); setMessages(data.messages); setPaused(data.paused); setError("");
        try { localStorage.setItem(STORAGE, JSON.stringify(value)); } catch { /* session stays in memory */ }
      } catch { if (!cancelled) setError(t("chatbot.unavailable")); }
      finally { if (!cancelled) setBusy(false); }
    }
    if (!session) void initialize();
    return () => { cancelled = true; };
  }, [open, session, locale, request, t]);

  useEffect(() => {
    if (!open || !session) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const data = await request(`/conversations/${session!.conversationId}`, { headers: { "X-Chat-Token": session!.token } });
        if (!stopped) { setMessages(data.messages); setPaused(data.paused); setError(""); }
      } catch { if (!stopped) setError(t("chatbot.unavailable")); }
      if (!stopped) timer = setTimeout(poll, 4000);
    }
    timer = setTimeout(poll, 4000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [open, session, request, t]);

  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest" }); }, [messages]);

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!session || busy || !text.trim()) return;
    const value = text.trim();
    if (pending.current?.text !== value) pending.current = { text: value, id: crypto.randomUUID() };
    setBusy(true); setError("");
    try {
      const data = await request(`/conversations/${session.conversationId}/messages`, { method: "POST", headers: { "Content-Type": "application/json", "X-Chat-Token": session.token }, body: JSON.stringify({ text: value, clientMessageId: pending.current!.id, locale }) });
      setMessages(data.messages); setPaused(data.paused); setText(""); pending.current = null;
    } catch { setError(t("chatbot.send_error")); }
    finally { setBusy(false); }
  };

  return <div className="fixed bottom-[calc(90px+env(safe-area-inset-bottom))] right-4 z-[90] text-ink md:bottom-6">
    {open && <section aria-label={t("chatbot.title")} className="mb-3 flex h-[min(560px,calc(100dvh-180px))] w-[min(380px,calc(100vw-32px))] flex-col border border-ink/20 bg-paper">
      <header className="flex items-center justify-between border-b border-ink/15 px-4 py-3">
        <h2 className="text-base font-medium">{t("chatbot.title")}</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("chatbot.close")} className="p-2"><X size={18} /></button>
      </header>
      {paused && <p className="border-b border-terracotta/20 bg-sand px-4 py-2 text-xs text-terracotta">{t("chatbot.human_mode")}</p>}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4"><ChatThread messages={messages} empty={t("chatbot.welcome")} /><div ref={bottom} /></div>
      {error && <p role="alert" className="px-4 pb-2 text-xs text-terracotta">{error}<br /><a href={`tel:${STORE.contact.phone}`} className="underline">{STORE.contact.phone}</a> · {STORE.contact.email}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-ink/15 p-3">
        <label className="sr-only" htmlFor="shop-chat-message">{t("chatbot.placeholder")}</label>
        <textarea id="shop-chat-message" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={2} placeholder={t("chatbot.placeholder")} className="min-w-0 flex-1 resize-none border border-ink/20 bg-white p-2 text-sm outline-none focus:border-ink" />
        <button type="submit" disabled={busy || !session || !text.trim()} aria-label={t("chatbot.send")} className="bg-ink px-3 text-paper disabled:opacity-40"><Send size={16} /></button>
      </form>
      {busy && <p role="status" className="px-4 pb-2 text-xs">{t("chatbot.waiting")}</p>}
    </section>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label={t("chatbot.open")} className="ml-auto flex h-12 items-center gap-2 border border-ink bg-espresso px-4 text-paper"><MessageCircle size={20} strokeWidth={1.5} /><span className="text-sm">{t("chatbot.button")}</span></button>
  </div>;
}
