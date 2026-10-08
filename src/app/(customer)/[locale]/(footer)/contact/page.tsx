"use client";

import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Phone, Mail, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  const { t } = useI18n();

  return (
    <section className="max-w-5xl mx-auto px-6 py-16 space-y-14">
      {/* Title */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{t("contact_title")}</h1>
        <p className="text-gray-600 max-w-xl mx-auto">
          {t("contact_subtitle")}
        </p>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border rounded-lg p-6 flex gap-4">
          <Phone />
          <div>
            <h3 className="font-semibold">{t("contact_phone_title")}</h3>
            <p className="text-gray-600">99125635</p>
          </div>
        </div>

        <div className="border rounded-lg p-6 flex gap-4">
          <Mail />
          <div>
            <h3 className="font-semibold">{t("contact_email_title")}</h3>
            <p className="text-gray-600">daisyshopmongol@gmail.com</p>
          </div>
        </div>

        <div className="border rounded-lg p-6 flex gap-4">
          <MapPin />
          <div>
            <h3 className="font-semibold">{t("contact_address_title")}</h3>
            <p className="text-gray-600">{t("contact_address")}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="border rounded-lg p-8 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold mb-6 text-center">
          {t("contact_form_title")}
        </h2>

        <form className="space-y-5">
          <input
            type="text"
            placeholder={t("contact_form_name")}
            className="w-full border rounded px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          <input
            type="email"
            placeholder={t("contact_form_email")}
            className="w-full border rounded px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          <textarea
            rows={5}
            placeholder={t("contact_form_message")}
            className="w-full border rounded px-4 py-3 outline-none focus:ring-2 focus:ring-black"
          />

          <button
            type="button"
            className="w-full bg-black text-white py-3 rounded flex items-center justify-center gap-2 hover:opacity-90"
          >
            <Send size={18} />
            {t("contact_form_send")}
          </button>
        </form>
      </div>
    </section>
  );
}
