import { STORE } from "@/config/store";
import { formatDateTime, formatMNT } from "@admin/utils/format";
import { normalizeDelivery } from "@admin/utils/normalizeDelivery";
import { type RawOrder, orderNumber } from "@/app/(admin)/admin/[locale]/(orders)/components/type";

type T = (key: string, params?: Record<string, string | number>) => string;

const escape = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

/** One page per order: who it goes to, what goes in the parcel, and whether money is still to be collected. */
function slip(order: RawOrder, t: T) {
  const d = normalizeDelivery(order);
  const items = order.orderItems ?? order.items ?? [];
  const name = [d?.lastName, d?.firstName].filter(Boolean).join(" ");
  const place = [d?.city, d?.district, d?.khoroo && t("orders.khoroo_n", { n: d.khoroo }), d?.address].filter(Boolean).join(", ");
  const method = t(`payment_method.${order.paymentMethod ?? "UNKNOWN"}`);
  const payment =
    order.paymentStatus === "PAID"
      ? t("orders.print.paid", { method })
      : order.paymentMethod === "COD"
        ? t("orders.print.collect", { amount: formatMNT(order.totalPrice) })
        : t("orders.print.unpaid");
  const rows = items
    .map((it) => `<tr><td>${escape(it.product?.productName ?? "—")}</td><td>${escape(it.size ?? "")}</td><td class="num">${escape(it.quantity)}</td></tr>`)
    .join("");
  return `<section class="slip">
  <header class="slip-head">
    <div><p class="slip-store">${escape(STORE.name)}</p>${STORE.contact.phone ? `<p class="slip-muted">${escape(STORE.contact.phone)}</p>` : ""}</div>
    <div class="slip-right"><p class="slip-label">${escape(t("orders.print.title"))}</p><p class="slip-number">#${escape(orderNumber(order))}</p><p class="slip-muted">${escape(formatDateTime(order.createdAt))}</p></div>
  </header>
  <div class="slip-block">
    <p class="slip-label">${escape(t("orders.print.ship_to"))}</p>
    ${name ? `<p class="slip-strong">${escape(name)}</p>` : ""}
    ${d?.phone ? `<p class="slip-strong">${escape(d.phone)}</p>` : ""}
    <p>${escape(place)}</p>
    ${d?.notes ? `<p class="slip-note"><span class="slip-label">${escape(t("orders.print.note"))}:</span> ${escape(d.notes)}</p>` : ""}
  </div>
  <table class="slip-items">
    <thead><tr><th>${escape(t("orders.print.item"))}</th><th>${escape(t("orders.print.option"))}</th><th class="num">${escape(t("orders.print.qty"))}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="slip-total"><span>${escape(t("orders.print.total"))}: <strong>${escape(formatMNT(order.totalPrice))}</strong></span><strong>${escape(payment)}</strong></div>
  <p class="slip-thanks">${escape(t("orders.print.thanks"))}</p>
</section>`;
}

/**
 * Prints packing slips from the current page: the slips are added to the page, the print stylesheet
 * (admin globals.css) hides everything else, and they are removed again once printing is done.
 */
export function printPackingSlips(orders: RawOrder[], t: T) {
  if (!orders.length) return;
  document.getElementById("print-slips")?.remove();
  const root = document.createElement("div");
  root.id = "print-slips";
  root.innerHTML = orders.map((order) => slip(order, t)).join("");
  document.body.appendChild(root);
  document.documentElement.classList.add("printing-slips");
  const cleanup = () => {
    document.documentElement.classList.remove("printing-slips");
    root.remove();
    window.removeEventListener("afterprint", cleanup);
  };
  window.addEventListener("afterprint", cleanup);
  window.print();
}
