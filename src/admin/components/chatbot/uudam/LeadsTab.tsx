"use client";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";
import { button, type Lead } from "../types";
import { ArrowLeft, ArrowRight, ExternalLink, MessageSquare } from "lucide-react";
import { useSupportCopy } from "../supportCopy";
export function LeadsTab({ leads, page, total, onPage, onUpdateStatus, onOpen, busyIds = [] }: { leads: Lead[]; page: number; total: number; onPage: (page: number) => void; onUpdateStatus: (lead: Lead, status: string) => void; onOpen: (id: string) => void; busyIds?: string[] }) {
  const { t } = useI18n();
  const copy = useSupportCopy();
  const status = (lead: Lead) => <select
    disabled={busyIds.includes(lead.id)}
    aria-label={`${t("chatbot.status")}: ${lead.name || lead.phone || lead.id}`}
    value={lead.status}
    onChange={(event) => onUpdateStatus(lead, event.target.value)}
    className="min-h-[44px] border border-ink/20 bg-white p-2 text-base disabled:opacity-50 sm:text-sm"
  >{["new", "contacted", "done"].map((value) => <option key={value} value={value}>{t(`chatbot.${value}`)}</option>)}</select>;

  return <div className="border border-ink/15 bg-white">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 p-5"><div><h2 className="text-base font-semibold">{t("chatbot.leads")} <span className="ml-1 font-normal tabular-nums text-taupe">{total}</span></h2><p className="mt-1 text-sm text-taupe">{copy.leadsHint}</p></div></div>
    <ul className="divide-y divide-ink/10 xl:hidden">
      {leads.map((lead) => <li key={lead.id} className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium">{lead.name || "—"}</p>
          {lead.phone && <a className="inline-flex min-h-[44px] items-center text-sm underline underline-offset-4" href={`tel:${lead.phone}`}>{lead.phone}</a>}
        </div>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink">{lead.question}</p>
        <div className="flex flex-wrap items-center justify-between gap-3">{status(lead)}<button type="button" className={`${button} inline-flex items-center gap-2`} onClick={() => onOpen(lead.conversationId)}>{t("chatbot.open")}<ExternalLink size={14} /></button></div>
      </li>)}
    </ul>
    <div className="hidden overflow-x-auto xl:block">
      <table className="w-full text-left text-sm">
        <thead className="bg-sand"><tr>{["name", "phone", "question", "status", "conversation"].map((key) => <th key={key} scope="col" className="p-3 font-medium">{t(`chatbot.${key}`)}</th>)}</tr></thead>
        <tbody>{leads.map((lead) => <tr key={lead.id} className="border-t border-ink/10">
          <td className="p-3">{lead.name || "—"}</td>
          <td className="p-3">{lead.phone ? <a className="inline-flex min-h-[44px] items-center underline underline-offset-4" href={`tel:${lead.phone}`}>{lead.phone}</a> : "—"}</td>
          <td className="max-w-md whitespace-pre-wrap break-words p-3">{lead.question}</td>
          <td className="p-3">{status(lead)}</td>
          <td className="p-3"><button type="button" className={`${button} inline-flex items-center gap-2`} onClick={() => onOpen(lead.conversationId)}>{t("chatbot.open")}<ExternalLink size={14} /></button></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!leads.length && <div className="flex flex-col items-center px-5 py-16 text-center"><MessageSquare size={28} strokeWidth={1.3} className="mb-5 text-taupe" /><h3 className="text-base font-medium">{t("chatbot.no_leads")}</h3><p className="mt-2 max-w-md text-sm leading-relaxed text-taupe">{copy.noLeadsHint}</p></div>}
    <div className="flex items-center justify-between gap-3 border-t border-ink/10 p-3">
      <button type="button" className={button} aria-label={t("previous")} disabled={page === 1} onClick={() => onPage(page - 1)}><ArrowLeft size={16} /></button>
      <span className="text-xs">{t("page_of", { page, total: Math.max(1, Math.ceil(total / 50)) })}</span>
      <button type="button" className={button} aria-label={t("next")} disabled={page * 50 >= total} onClick={() => onPage(page + 1)}><ArrowRight size={16} /></button>
    </div>
  </div>;
}
