"use client";

import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Briefcase, Users, Mail } from "lucide-react";

export default function CareersPage() {
  const { t } = useI18n();

  return (
    <section className="max-w-5xl mx-auto px-6 py-20 space-y-16">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">{t("careers_title")}</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          {t("careers_subtitle")}
        </p>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border rounded-xl p-6 space-y-3">
          <Users />
          <h3 className="font-semibold text-lg">
            {t("careers_value_1_title")}
          </h3>
          <p className="text-gray-600 text-sm">{t("careers_value_1_desc")}</p>
        </div>

        <div className="border rounded-xl p-6 space-y-3">
          <Briefcase />
          <h3 className="font-semibold text-lg">
            {t("careers_value_2_title")}
          </h3>
          <p className="text-gray-600 text-sm">{t("careers_value_2_desc")}</p>
        </div>

        <div className="border rounded-xl p-6 space-y-3">
          <Mail />
          <h3 className="font-semibold text-lg">
            {t("careers_value_3_title")}
          </h3>
          <p className="text-gray-600 text-sm">{t("careers_value_3_desc")}</p>
        </div>
      </div>

      {/* Open roles */}
      <div className="border rounded-xl p-10 text-center space-y-4">
        <h2 className="text-xl font-semibold">{t("careers_open_title")}</h2>
        <p className="text-gray-600">{t("careers_open_desc")}</p>
      </div>

      {/* Contact */}
      <div className="text-center space-y-4">
        <p className="text-gray-600">{t("careers_contact_text")}</p>
        <p className="font-semibold">daisyshopmongol@gmail.com</p>
      </div>
    </section>
  );
}
