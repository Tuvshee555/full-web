// src/components/Footer.tsx
"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import {
  Phone,
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  ArrowUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Footer() {
  const router = useRouter();
  const { locale } = useParams<{ locale: string }>();
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const brandDescription =
    locale === "mn"
      ? "Шинэхэн, амтат хоолыг халуун дулаанаар нь хурдан шуурхай хүргэнэ."
      : locale === "ko"
      ? "신선하고 맛있는 음식을 뜨겁게, 빠르고 안정적으로 배달합니다."
      : t("footer_brand_description");

  const go = (path: string) => {
    router.push(`/${locale}${path}`);
  };

  const helpLinks: [string, string][] = [
    ["/about", "footer_about_us"],
    ["/contact", "footer_contact"],
    ["/faq", "footer_faq"],
    ["/blog", "footer_posts"],
    ["/careers", "footer_jobs"],
    ["/branches", "footer_branches"],
  ];

  const productLinks: [string, string][] = [
    ["/category/all", "footer_all_products"],
    ["/category/featured", "footer_featured"],
    ["/category/bestseller", "footer_bestseller"],
    ["/category/discounted", "footer_discounted"],
  ];

  const contactItems = [
    { icon: Phone, value: "86185769", href: "tel:86185769" },
    { icon: Mail, value: "ganturtuvshinsaihan@gmail.com", href: "mailto:ganturtuvshinsaihan@gmail.com" },
    { icon: MapPin, value: t("contact_address"), href: undefined },
  ];

  return (
    <>
      <footer className="w-full bg-zinc-900 text-zinc-100 mt-24">
        {/* Top CTA strip */}
        <div className="border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-bold text-zinc-100">{t("footer_cta_title")}</h3>
              <p className="text-zinc-400 text-sm mt-1">{t("footer_cta_subtitle")}</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("footer_email_placeholder")}
                className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 w-full md:w-64"
              />
              <Button variant="outline" className="shrink-0 border-zinc-700 text-zinc-100 hover:bg-zinc-800 hover:text-zinc-100">
                {t("subscribe")}
              </Button>
            </div>
          </div>
        </div>

        {/* Main footer grid */}
        <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Brand column */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 relative rounded-md overflow-hidden bg-zinc-800 border border-zinc-700">
                <Image src="/order1.png" alt={t("site_name")} fill className="object-contain" />
              </div>
              <span className="font-bold text-lg text-zinc-100">{t("site_name")}</span>
            </div>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              {brandDescription}
            </p>
            <div className="flex gap-3">
              {[
                { Icon: Facebook, href: "https://facebook.com" },
                { Icon: Instagram, href: "https://instagram.com" },
                { Icon: Youtube, href: "https://youtube.com" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center hover:bg-zinc-700 transition-colors"
                >
                  <Icon className="w-4 h-4 text-zinc-400" />
                </a>
              ))}
            </div>
          </div>

          {/* Help links */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-widest mb-5 text-zinc-500">
              {t("footer_menu_help")}
            </h4>
            <ul className="space-y-3">
              {helpLinks.map(([path, key]) => (
                <li key={path}>
                  <button
                    onClick={() => go(path)}
                    className="text-zinc-400 text-sm hover:text-zinc-100 transition-colors text-left"
                  >
                    {t(key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold text-xs uppercase tracking-widest mb-5 text-zinc-500">
              {t("footer_products")}
            </h4>
            <ul className="space-y-3">
              {productLinks.map(([path, key]) => (
                <li key={path}>
                  <button
                    onClick={() => go(path)}
                    className="text-zinc-400 text-sm hover:text-zinc-100 transition-colors text-left"
                  >
                    {t(key)}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="pb-[80px] md:pb-0">
            <h4 className="font-semibold text-xs uppercase tracking-widest mb-5 text-zinc-500">
              {t("footer_contact")}
            </h4>
            <ul className="space-y-3">
              {contactItems.map(({ icon: Icon, value, href }, i) =>
                href ? (
                  <li key={i}>
                    <a
                      href={href}
                      className="flex items-start gap-2 text-zinc-400 text-sm hover:text-zinc-100 transition-colors"
                    >
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                      {value}
                    </a>
                  </li>
                ) : (
                  <li key={i} className="flex items-start gap-2 text-zinc-400 text-sm">
                    <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                    {value}
                  </li>
                )
              )}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-zinc-800">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row items-center justify-between gap-2">
            <p className="text-zinc-500 text-xs">
              © {new Date().getFullYear()} {t("site_name")}. {t("all_rights_reserved")}
            </p>
            <div className="flex gap-6">
              <a href="#" className="text-zinc-500 text-xs hover:text-zinc-100 transition-colors">
                {t("privacy_policy")}
              </a>
              <a href="#" className="text-zinc-500 text-xs hover:text-zinc-100 transition-colors">
                {t("terms_of_service")}
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-10 w-10 sm:h-12 sm:w-12
          rounded-lg bg-card border border-border flex items-center justify-center hover:bg-muted z-40"
        aria-label={t("back_to_top")}
      >
        <ArrowUp size={16} />
      </button>
    </>
  );
}
