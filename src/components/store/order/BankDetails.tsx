"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import { STORE } from "@/config/store";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { money } from "../lib/product";

/** Where to send a bank transfer for an order: shown after checkout and on the order page. */
export function BankDetails({ orderNumber, amount }: { orderNumber: string; amount: number }) {
  const { t } = useI18n();

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copy_failed"));
    }
  };

  return (
    <div>
      <dl className="divide-y divide-ink/10 border-y border-ink/10">
        <Row label={t("bank_name")} value={STORE.bank.name} />
        <Row label={t("account_holder")} value={STORE.bank.holder} />
        <Row label={t("account_number")} value={STORE.bank.account} onCopy={() => copy(STORE.bank.account)} />
        <Row label={t("transfer_description")} value={orderNumber} onCopy={() => copy(orderNumber)} strong />
        <Row label={t("total_amount")} value={money(amount)} onCopy={() => copy(String(amount))} strong />
      </dl>
      <p className="mt-[16px] bg-sand px-[16px] py-[14px] text-[14px] text-ink/80">
        {t("bank_transfer_notice")} <span className="font-medium text-ink">{orderNumber}</span>
      </p>
    </div>
  );
}

function Row({ label, value, onCopy, strong }: { label: string; value: string; onCopy?: () => void; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[12px] py-[14px] text-[15px]">
      <dt className="text-ink/60">{label}</dt>
      <dd className="flex min-w-0 items-center gap-[6px] text-right">
        <span className={`break-all ${strong ? "font-medium text-ink" : "text-ink"}`}>{value}</span>
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`${label}: copy`}
            className="flex h-[32px] w-[32px] shrink-0 items-center justify-center text-ink/50 transition-colors hover:text-ink"
          >
            <Copy className="h-[14px] w-[14px]" strokeWidth={1.3} />
          </button>
        )}
      </dd>
    </div>
  );
}
