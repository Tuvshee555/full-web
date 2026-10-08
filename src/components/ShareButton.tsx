"use client";

import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { toast } from "sonner";

type Props = {
  title: string;
  url?: string; // optional — if not provided it will fallback to window.location.href
};

export const ShareButton = ({ title, url }: Props) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // fallback url if not provided
  const getUrl = () => {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.href;
    return "";
  };

  // close on outside click or ESC
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!open) return;
      if (
        menuRef.current &&
        btnRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, text: title, url: getUrl() });
        setOpen(false);
        return;
      }
    } catch {
      // ignore (user cancelled)
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getUrl());
      toast.success(t("copied_link"));
      setOpen(false);
    } catch {
      toast.error(t("copy_failed") || "Copy failed");
    }
  };

  const openWindow = (link: string) => {
    window.open(link, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  const handleFacebook = () => {
    const u = encodeURIComponent(getUrl());
    openWindow(`https://www.facebook.com/sharer/sharer.php?u=${u}`);
  };

  const handleTwitter = () => {
    const u = encodeURIComponent(getUrl());
    const text = encodeURIComponent(title);
    openWindow(`https://twitter.com/intent/tweet?text=${text}&url=${u}`);
  };

  const handleInstagram = () => {
    // Instagram doesn't have an official "share URL" like Twitter/Facebook.
    // This opens Instagram home (web) so user can paste link or open the app.
    // On mobile the native share will handle app-to-app sharing.
    openWindow(`https://www.instagram.com/`);
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${title}\n\n${getUrl()}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={async () => {
          // if navigator.share exists — prefer it on mobile
          if (navigator.share && typeof navigator.share === "function") {
            try {
              await handleNativeShare();
              return;
            } catch {
              /* fallback to menu below */
            }
          }
          setOpen((s) => !s);
        }}
        className="
          inline-flex items-center justify-center
          gap-2 px-2 py-1
          text-sm font-medium
          text-muted-foreground
          hover:text-foreground
          active:scale-[0.97]
          transition-colors
          focus:outline-none
        "
        aria-label={t("share")}
      >
        {/* share icon (simple) */}
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M4 12v7a1 1 0 001 1h14a1 1 0 001-1v-7"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M16 6l-4-4-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 2v14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {/* menu */}
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={t("share_options")}
          className="
            z-50 mt-2 right-0
            absolute
            w-[220px]
            bg-card
            border border-border
            rounded-lg
            shadow-md
            p-2
            "
        >
          <ul className="flex flex-col">
            <li>
              <button
                onClick={handleFacebook}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M18 2h-3a4 4 0 00-4 4v3H8v4h3v8h4v-8h3l1-4h-4V6a1 1 0 011-1h3V2z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm">
                  {t("share_facebook") || "Facebook"}
                </span>
              </button>
            </li>

            <li>
              <button
                onClick={handleTwitter}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M23 3a10.9 10.9 0 01-3.14 1.53A4.48 4.48 0 0016 3a4.48 4.48 0 00-4.47 4.47c0 .35.04.69.11 1.02A12.8 12.8 0 013 4.79a4.48 4.48 0 001.39 5.97 4.41 4.41 0 01-2.03-.56v.06A4.48 4.48 0 004.5 14a4.48 4.48 0 01-2 .08 4.48 4.48 0 004.19 3.11A9 9 0 012 19.54 12.8 12.8 0 008.29 21c7.55 0 11.68-6.26 11.68-11.68v-.53A8.18 8.18 0 0023 3z"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm">
                  {t("share_twitter") || "Twitter"}
                </span>
              </button>
            </li>

            <li>
              <button
                onClick={handleInstagram}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                  <path
                    d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M17.5 6.5h.01"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm">
                  {t("share_instagram") || "Instagram"}
                </span>
              </button>
            </li>

            <li>
              <button
                onClick={handleEmail}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M3 8.5v7a2 2 0 002 2h14a2 2 0 002-2v-7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 8.5l8.5 6L20 8.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className="text-sm">{t("share_email") || "Email"}</span>
              </button>
            </li>

            <li>
              <button
                onClick={handleCopy}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md"
                role="menuitem"
              >
                <svg
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M8 17H6a2 2 0 01-2-2V6a2 2 0 012-2h7a2 2 0 012 2v2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <rect
                    x="8"
                    y="8"
                    width="12"
                    height="12"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                  />
                </svg>
                <span className="text-sm">{t("copy_link") || "Copy link"}</span>
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
