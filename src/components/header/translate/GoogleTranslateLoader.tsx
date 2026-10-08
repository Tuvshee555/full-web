/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect } from "react";

export default function GoogleTranslateLoader() {
  useEffect(() => {
    // Already loaded?
    if (document.getElementById("google-translate-script")) return;

    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "mn",
          includedLanguages: "mn,en,ru,ko,ja",
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };

    const script = document.createElement("script");
    script.id = "google-translate-script";
    script.src =
      "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    document.body.appendChild(script);

    const applySaved = () => {
      try {
        const saved = localStorage.getItem("preferred_lang");
        if (!saved) return;
        const select = document.querySelector(
          ".goog-te-combo"
        ) as HTMLSelectElement | null;
        if (!select) return;

        select.value = saved;

        const event = document.createEvent("HTMLEvents");
        event.initEvent("change", true, true);
        select.dispatchEvent(event);
      } catch {
        // ignore
      }
    };

    const interval = setInterval(applySaved, 600);
    const timeout = setTimeout(() => clearInterval(interval), 7000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, []);

  return null;
}
