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
  const input = useRef<HTMLTextAreaElement>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [paused, setPaused] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);
  const pending = useRef<{ text: string; id: string } | null>(null);
  const initialization = useRef<Promise<{ session: Session; messages: ChatMessage[]; paused: boolean }> | null>(null);
  const request = useCallback(async (path: string, init?: RequestInit) => {
    const res = await fetch(`${API_BASE_URL}/chatbot/public${path}`, { ...init, cache: "no-store", signal: AbortSignal.timeout(25_000) });
    if (!res.ok) throw Object.assign(new Error("CHAT_ERROR"), { status: res.status });
    return res.json();
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function restoreSession() {
        let stored: Session | null = null;
        try {
          const raw = localStorage.getItem(STORAGE);
          const value = raw ? JSON.parse(raw) : null;
          if (typeof value?.conversationId === "string" && typeof value?.token === "string") stored = value;
        } catch { /* restricted storage still permits an in-memory session */ }
        if (stored) {
          try {
            const data = await request(`/conversations/${stored.conversationId}`, { headers: { "X-Chat-Token": stored.token } });
            return { session: stored, messages: data.messages, paused: data.paused };
          } catch (err) { if ((err as { status?: number }).status !== 404) throw err; }
        }
        const data = await request("/conversations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale }) });
        const value = { conversationId: data.conversationId, token: data.token };
        try { localStorage.setItem(STORAGE, JSON.stringify(value)); } catch { /* session stays in memory */ }
        return { session: value, messages: data.messages, paused: data.paused };
    }
    async function initialize() {
      setBusy(true);
      // Share creation across Strict Mode's effect replay and rapid open/close.
      if (!initialization.current) initialization.current = restoreSession();
      try {
        const data = await initialization.current;
        if (!cancelled) { setBusy(false); setSession(data.session); setMessages(data.messages); setPaused(data.paused); setError(""); }
      } catch {
        initialization.current = null;
        if (!cancelled) { setBusy(false); setError(t("chatbot.unavailable")); }
      }
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

  // Keyboard: Esc closes the panel, opening it puts the cursor in the message box.
  useEffect(() => {
    if (!open) return;
    // Only where there is a physical keyboard: on a phone, focusing would raise the keyboard over the conversation.
    if (window.matchMedia("(pointer: fine)").matches) input.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

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

  // Low in the corner; on a phone's product page it lifts above the buy bar while that bar is showing (html[data-buybar], set by ProductPage).
  return <div className="fixed bottom-[calc(16px+env(safe-area-inset-bottom))] right-4 z-widget text-ink transition-[bottom] duration-300 [html[data-buybar=on]_&]:bottom-[calc(88px+env(safe-area-inset-bottom))] lg:bottom-6 lg:[html[data-buybar=on]_&]:bottom-6">
    {open && <section id="shop-chat-panel" aria-label={t("chatbot.title")} className="mb-3 flex h-[min(560px,calc(100dvh-180px))] w-[min(380px,calc(100vw-32px))] flex-col border border-ink/20 bg-paper">
      <header className="flex items-center justify-between border-b border-ink/15 px-4 py-3">
        <h2 className="text-base font-medium">{t("chatbot.title")}</h2>
        <button type="button" onClick={() => setOpen(false)} aria-label={t("chatbot.close")} className="flex h-11 w-11 items-center justify-center"><X size={18} /></button>
      </header>
      {paused && <p className="border-b border-terracotta/20 bg-sand px-4 py-2 text-xs text-terracotta">{t("chatbot.human_mode")}</p>}
      <div className="flex-1 overflow-y-auto overscroll-contain p-4"><ChatThread messages={messages} empty={t("chatbot.welcome")} staffLabel={t("chatbot.staff")} /><div ref={bottom} /></div>
      {error && <p role="alert" className="px-4 pb-2 text-xs text-terracotta">{error}<br /><a href={`tel:${STORE.contact.phone}`} className="underline">{STORE.contact.phone}</a> · {STORE.contact.email}</p>}
      <form onSubmit={send} className="flex gap-2 border-t border-ink/15 p-3">
        <label className="sr-only" htmlFor="shop-chat-message">{t("chatbot.placeholder")}</label>
        <textarea id="shop-chat-message" ref={input} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={2} placeholder={t("chatbot.placeholder")} className="min-w-0 flex-1 resize-none border border-ink/20 bg-white p-2 text-base outline-none md:text-sm focus:border-ink" />
        <button type="submit" disabled={busy || !session || !text.trim()} aria-label={t("chatbot.send")} className="bg-ink px-3 text-paper disabled:opacity-40"><Send size={16} /></button>
      </form>
      {busy && <p role="status" className="px-4 pb-2 text-xs">{t("chatbot.waiting")}</p>}
    </section>}
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="shop-chat-panel" aria-label={open ? t("chatbot.close") : t("chatbot.open")} className="ml-auto flex h-12 w-12 items-center justify-center gap-2 border border-ink bg-espresso text-paper transition-colors duration-300 hover:bg-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink md:w-auto md:px-4">{open ? <X size={20} strokeWidth={1.5} /> : <MessageCircle size={20} strokeWidth={1.5} />}<span className="hidden text-sm md:inline">{t("chatbot.button")}</span></button>
  </div>;
}
