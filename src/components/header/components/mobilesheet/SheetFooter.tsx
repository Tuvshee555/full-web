"use client";

import Link from "next/link";
import {
  Facebook,
  Instagram,
  Youtube,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import TranslateButton from "../../translate/TranslateButton";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default function SheetFooter({
  locale,
  t,
  onClose,
}: {
  locale: string;
  t: (k: string, def?: string) => string;
  onClose: () => void;
}) {
  return (
    <div className="pb-8  space-y-6 text-base">
      {/* Help links */}
      <div className="flex flex-col gap-3">
        <div className="font-medium text-base">{t("footer_menu_help")}</div>
        <div className="flex flex-col gap-2 text-muted-foreground text-sm">
          {[
            ["/about", "footer_about_us"],
            ["/contact", "footer_contact"],
            ["/faq", "footer_faq"],
            ["/blog", "footer_posts"],
            ["/careers", "footer_jobs"],
            ["/branches", "footer_branches"],
          ].map(([p, k]) => (
            <Link
              key={p}
              href={`/${locale}${p}`}
              onClick={onClose}
              className="block py-1"
            >
              {t(k)}
            </Link>
          ))}
        </div>
      </div>

      {/* Product links */}
      <div className="flex flex-col gap-3">
        <div className="font-medium text-base">{t("footer_products")}</div>
        <div className="flex flex-col gap-2 text-muted-foreground text-sm">
          {[
            ["/category/all", "footer_all_products"],
            ["/category/featured", "footer_featured"],
            ["/category/bestseller", "footer_bestseller"],
            ["/category/discounted", "footer_discounted"],
          ].map(([p, k]) => (
            <Link
              key={p}
              href={`/${locale}${p}`}
              onClick={onClose}
              className="block py-1"
            >
              {t(k)}
            </Link>
          ))}
        </div>
      </div>

      {/* Contact + centered social & translate */}
      <div className="flex flex-col gap-3 items-center text-center">
        <div className="font-medium text-base">{t("footer_contact")}</div>

        <div className="flex flex-col gap-2 text-muted-foreground text-sm items-center">
          <a
            href={`tel:${t("footer_phone")}`}
            className="flex items-center gap-3 py-1"
          >
            <Phone size={18} />
            <span>{t("footer_phone")}</span>
          </a>

          <a
            href={`mailto:${t("footer_email")}`}
            className="flex items-center gap-3 py-1"
          >
            <Mail size={18} />
            <span className="truncate">{t("footer_email")}</span>
          </a>

          <div className="flex items-start gap-3 py-1">
            <MapPin size={18} />
            <span className="text-sm text-muted-foreground">
              {t("footer_address")}
            </span>
          </div>
        </div>

        {/* social icons centered */}
        <div className="flex items-center gap-6 mt-2">
          <a
            href={t("social_facebook_url") || "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="facebook"
            className="p-1"
          >
            <Facebook size={20} />
          </a>
          <a
            href={t("social_instagram_url") || "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="instagram"
            className="p-1"
          >
            <Instagram size={20} />
          </a>
          <a
            href={t("social_youtube_url") || "#"}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="youtube"
            className="p-1"
          >
            <Youtube size={20} />
          </a>
        </div>

        {/* Translate + Theme */}
        <div className="mt-3 flex items-center gap-4">
          <TranslateButton />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
