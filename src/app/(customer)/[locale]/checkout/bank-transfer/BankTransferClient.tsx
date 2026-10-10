/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "axios";
import { toast } from "sonner";
import { ArrowRight, Copy } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { STORE } from "@/config/store";
import { money } from "@/components/store/lib/product";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { OrderStatusShell } from "@/components/store/order/OrderStatusShell";

/** Bank-transfer "thank you" page: account details to transfer to + order summary. */
export default function BankTransferPage() {
  const { t } = useI18n();
  const { st, locale } = useStoreT();
  const orderId = useSearchParams().get("orderId");
  const [order, setOrder] = useState<any>(null);
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
    <OrderStatusShell order={state === "ready" ? order : undefined}>
      {state === "loading" && <div className="h-[300px] animate-pulse bg-sand" />}

      {state === "missing" && (
        <div>
          <h1 className="store-heading text-[40px]">{st("order_not_found")}</h1>
          <Link href={`/${locale}`} className="link-underline mt-[16px] inline-block text-ink">
            {st("back_to_store")}
          </Link>
        </div>
      )}

      {state === "ready" && order && (
        <>
          <span className="eyebrow">{st("order_n", { n: order.orderNumber })}</span>
          <h1 className="store-heading mt-[12px] text-[44px] md:text-[56px]">{t("bank_transfer_title")}</h1>
          <p className="mt-[10px] text-[15px] text-ink/70">{t("bank_transfer_subtitle")}</p>

          <dl className="mt-[32px] divide-y divide-ink/10 border-y border-ink/10">
            <Row label={t("bank_name")} value={STORE.bank.name} />
            <Row label={t("account_holder")} value={STORE.bank.holder} />
            <Row label={t("account_number")} value={STORE.bank.account} onCopy={() => copy(STORE.bank.account)} />
            <Row label={t("transfer_description")} value={order.orderNumber} onCopy={() => copy(order.orderNumber)} strong />
            <Row label={t("total_amount")} value={money(order.totalPrice)} onCopy={() => copy(String(order.totalPrice))} strong />
          </dl>

          <p className="mt-[18px] bg-sand px-[16px] py-[14px] text-[14px] text-ink/80">
            {t("bank_transfer_notice")} <span className="font-medium text-ink">{order.orderNumber}</span>
          </p>

          <div className="mt-[32px] flex flex-col-reverse gap-[16px] sm:flex-row sm:items-center sm:justify-between">
            <Link href={`/${locale}`} className="link-underline text-[14px] text-ink">
              {st("back_to_store")}
            </Link>
            <Link href={`/${locale}/profile/orders/${order.id}`} className="btn group">
              {st("view_order")}
              <span className="btn-arrow">
                <ArrowRight className="h-[16px] w-[16px]" strokeWidth={1.3} />
              </span>
            </Link>
          </div>
        </>
      )}
    </OrderStatusShell>
  );
}

function Row({ label, value, onCopy, strong }: { label: string; value: string; onCopy?: () => void; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-[12px] py-[14px] text-[15px]">
      <dt className="text-ink/60">{label}</dt>
      <dd className="flex items-center gap-[10px] text-right">
        <span className={strong ? "font-medium text-ink" : "text-ink"}>{value}</span>
        {onCopy && (
          <button type="button" onClick={onCopy} aria-label="copy" className="p-[4px] text-ink/50 transition-colors hover:text-ink">
            <Copy className="h-[14px] w-[14px]" strokeWidth={1.3} />
          </button>
        )}
      </dd>
    </div>
  );
}
