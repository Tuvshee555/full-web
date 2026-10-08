/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type AIItem = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
};

type Msg = {
  role: "user" | "ai";
  text: string;
  items?: AIItem[];
};

export const AIChat = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg = { role: "user" as const, text: input };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Send recent turns so the backend's conversation memory can work.
      const history = [...messages, userMsg].slice(-6).map((msg) => ({
        role: msg.role,
        text: msg.text,
      }));

      const res = await api.post(`/ai/ai-chat`, {
        message: input,
        history,
      });

      const data = res.data;

      setMessages((m) => [
        ...m,
        { role: "ai", text: data.reply, items: data.items || [] },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "AI unavailable.", items: [] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed right-5 bottom-5 w-12 h-12 rounded-full bg-primary text-white z-50 shadow-lg"
      >
        AI
      </button>

      {open && (
        <div className="fixed right-5 bottom-20 w-[340px] bg-background border border-border rounded-xl shadow-xl flex flex-col z-50">
          <div className="px-4 py-2 font-semibold border-b">Food Assistant</div>

          <div className="p-3 flex-1 overflow-y-auto space-y-3 text-sm">
            {messages.map((m, i) => (
              <div key={i}>
                <div
                  className={`p-2 rounded-md max-w-[85%] ${
                    m.role === "user"
                      ? "bg-primary text-white ml-auto"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {m.text}
                </div>

                {/* 🔥 AI PRODUCT CARDS */}
                {m.items && m.items.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {m.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => router.push(`/mn/food/${item.id}`)}
                        className="flex gap-2 p-2 border border-border rounded-lg cursor-pointer hover:bg-muted transition"
                      >
                        <img
                          src={item.image || "/placeholder.png"}
                          className="w-14 h-14 object-cover rounded-md"
                        />
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.price.toLocaleString()}₮
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && <div className="text-xs">AI typing…</div>}
          </div>

          <div className="flex border-t p-2 gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              className="flex-1 text-sm outline-none"
              placeholder="Ask about food..."
            />
            <button
              onClick={sendMessage}
              className="px-3 py-1 text-sm rounded-md text-white bg-primary"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
};
