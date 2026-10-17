"use client";

export type ChatMessage = { id: string; role: string; text: string; createdAt?: string; deliveryStatus?: string };

function MessageText({ text }: { text: string }) {
  return <>{text.split(/(https?:\/\/[^\s]+)/g).map((part, i) => /^https?:\/\//.test(part)
    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{part}</a>
    : <span key={i}>{part}</span>)}</>;
}
export function ChatThread({ messages, empty, deliveryLabel, staffLabel }: { messages: ChatMessage[]; empty?: string; deliveryLabel?: (status: string) => string; staffLabel?: string }) {
  return <div className="space-y-3" role="log" aria-live="polite" aria-relevant="additions">
    {!messages.length && <p className="text-sm text-taupe">{empty}</p>}
    {messages.map((message) => <div key={message.id} className={`max-w-[94%] whitespace-pre-wrap break-words border px-3 py-2 text-sm leading-relaxed ${message.role === "customer" ? "ml-auto border-ink/15 bg-sand" : message.role === "human" ? "mr-auto border-terracotta/30 bg-white" : "mr-auto border-ink/10 bg-white"}`}>
      {staffLabel && message.role === "human" && <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-terracotta">{staffLabel}</p>}
      <MessageText text={message.text} />
      {deliveryLabel && message.role !== "customer" && message.deliveryStatus && message.deliveryStatus !== "local" && <p className="mt-2 text-xs text-taupe">{deliveryLabel(message.deliveryStatus)}</p>}
    </div>)}
  </div>;
}
