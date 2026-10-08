"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { CheckCircle2, Copy } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { STORE, SHOPIFY_BLUE } from "@/config/store";
import { money } from "@/components/store/lib/product";

type Order = {
  id: string;
  orderNumber: string;
  totalPrice: number;
  paymentMethod: "BANK" | "QPAY" | "COD";
  firstName?: string | null;
};

/** Shopify-style "Thank you" page for bank-transfer orders. */
export default function BankTransferPage() {
  const { t, locale } = useI18n();
  const orderId = useSearchParams().get("orderId");
  const [order, setOrder] = useState<Order | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    // Read the token directly: the auth context hydrates a tick later, and a
    // guest who just checked out must not be bounced to a login page.
    const token = localStorage.getItem("token");
    if (!orderId || !token) return setState("missing");
    axios
      .get(`${API_BASE_URL}/order/${orderId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        setOrder(res.data);
        setState("ready");
      })
      .catch(() => setState("missing"));
  }, [orderId]);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t("copied"));
    } catch {
      toast.error(t("copy_failed"));
    }
  };

  return (
    <div className="min-h-screen bg-white text-[14px] text-[#121212]">
      <header className="border-b border-[#dedede]">
        <div className="mx-auto flex h-[64px] lg:h-[80px] max-w-[640px] items-center px-[20px]">
          <Link href={`/${locale}`} className="text-[22px]">
            {STORE.name}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[640px] px-[20px] py-[32px]">
        {state === "loading" && <p className="text-[#707070]">{t("loading")}</p>}

        {state === "missing" && (
          <div className="space-y-[16px]">
            <p>{t("order_not_found")}</p>
            <Link href={`/${locale}`} className="underline" style={{ color: SHOPIFY_BLUE }}>
              {t("back_home")}
            </Link>
          </div>
        )}

        {state === "ready" && order && (
          <>
            <div className="flex items-center gap-[14px]">
              <CheckCircle2 className="h-[44px] w-[44px] shrink-0" strokeWidth={1.2} style={{ color: SHOPIFY_BLUE }} />
              <div>
                <p className="text-[13px] text-[#707070]">#{order.orderNumber}</p>
                <h1 className="text-[22px] font-semibold">{t("bank_transfer_title")}</h1>
              </div>
            </div>

            <section className="mt-[24px] rounded-[5px] border border-[#dedede] p-[18px]">
              <p className="mb-[14px] text-[#545454]">{t("bank_transfer_subtitle")}</p>
              <dl className="divide-y divide-[#dedede]">
                <Row label={t("bank_name")} value={STORE.bank.name} />
                <Row label={t("account_holder")} value={STORE.bank.holder} />
                <Row label={t("account_number")} value={STORE.bank.account} onCopy={() => copy(STORE.bank.account)} />
                <Row label={t("transfer_description")} value={order.orderNumber} onCopy={() => copy(order.orderNumber)} strong />
                <Row label={t("total_amount")} value={money(order.totalPrice)} onCopy={() => copy(String(order.totalPrice))} strong />
              </dl>
            </section>

            <p className="mt-[16px] rounded-[5px] bg-[#f5f5f5] p-[14px] text-[13px] text-[#545454]">
              {t("bank_transfer_notice")} <span className="font-semibold text-[#121212]">{order.orderNumber}</span>
            </p>

            <div className="mt-[24px] flex flex-col-reverse gap-[12px] sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/${locale}`} className="underline underline-offset-[3px]" style={{ color: SHOPIFY_BLUE }}>
                {t("back_home")}
              </Link>
              <Link
                href={`/${locale}/profile/orders/${order.id}`}
                className="flex h-[52px] items-center justify-center rounded-[5px] px-[24px] font-semibold text-white"
                style={{ background: SHOPIFY_BLUE }}
              >
                {t("view_order")}
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function Row({ label, value, onCopy, strong }: { label: string; value: string; onCopy?: () => void; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[12px] py-[10px]">
      <dt className="text-[#707070]">{label}</dt>
      <dd className="flex items-center gap-[8px] text-right">
        <span className={strong ? "font-semibold" : ""}>{value}</span>
        {onCopy && (
          <button type="button" onClick={onCopy} aria-label="copy" className="p-[4px]" style={{ color: SHOPIFY_BLUE }}>
            <Copy className="h-[14px] w-[14px]" />
          </button>
        )}
      </dd>
    </div>
  );
}
