"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

const languages = [
  { code: "mn", name: "Монгол", flag: "🇲🇳" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },

  // You can add many more like the screenshot
  { code: "zh-CN", name: "Chinese (Simplified)", flag: "🇨🇳" },
  { code: "zh-TW", name: "Chinese (Traditional)", flag: "🇹🇼" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
];

export default function TranslateDialog() {
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState("mn");

  useEffect(() => {
    const saved = localStorage.getItem("preferred_lang");
    if (saved) setCurrent(saved);
  }, []);

  const applyLanguage = (code: string) => {
    const select = document.querySelector(
      ".goog-te-combo"
    ) as HTMLSelectElement | null;
    if (select) {
      select.value = code;
      const event = document.createEvent("HTMLEvents");
      event.initEvent("change", true, true);
      select.dispatchEvent(event);
    }
    localStorage.setItem("preferred_lang", code);
    setCurrent(code);
    setOpen(false);
  };

  const currentLang = languages.find((l) => l.code === current);
  const flag = currentLang?.flag ?? "🌐";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="flex items-center gap-2 bg-black/60 border border-gray-500
          rounded-md px-3 py-1.5 text-white hover:border-gray-200 transition text-sm"
        >
          <Globe size={16} />
          {flag}
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-[600px] p-6 bg-[#0c0c0c] text-white border-gray-800 rounded-xl">
        <h3 className="text-lg font-semibold text-center mb-4">
          Орчуулах хэлээ сонгоно уу
        </h3>

        <ScrollArea className="max-h-[300px]">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {languages.map((l) => (
              <Button
                key={l.code}
                variant="outline"
                className="w-full flex justify-start gap-2 text-white border-gray-700 hover:border-amber-400"
                onClick={() => applyLanguage(l.code)}
              >
                <span className="text-lg">{l.flag}</span>
                {l.name}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
