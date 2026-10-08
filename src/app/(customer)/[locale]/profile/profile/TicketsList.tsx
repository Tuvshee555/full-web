"use client";

import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { Ticket } from "lucide-react";

export const TicketsList = () => {
  const { t } = useI18n();

  return (
    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
      <h1 className="text-base font-semibold flex items-center gap-2">
        <Ticket size={16} />
        {t("my_tickets")}
      </h1>

      <p className="text-sm leading-relaxed">{t("no_tickets_text")}</p>

      <div className="border border-border rounded-md p-4 text-sm text-center">
        {t("tickets_coming_soon")}
      </div>
    </div>
  );
};
