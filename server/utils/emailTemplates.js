// Customer emails: one builder for every order message, in the store's own look.
// Plain tables + inline styles (email clients ignore stylesheets and most flexbox).
import { siteUrl } from "./siteUrl.js";
import { STORE } from "../../src/config/store-data.mjs";

const C = { paper: "#fbf8f3", ink: "#1c1714", taupe: "#6f655d", line: "#e7dfd4", sand: "#efe7dd", accent: "#a8452f" };
const SERIF = "Georgia,'Times New Roman',serif";
const SANS = "Arial,Helvetica,sans-serif";

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const money = (n) => `${Math.round(Number(n || 0)).toLocaleString("en-US")}₮`;

export const STATUS_MN = {
  PENDING: "Баталгаажуулалт хүлээж байна",
  WAITING_PAYMENT: "Төлбөр хүлээгдэж байна",
  COD_PENDING: "Баталгаажуулалт хүлээж байна",
  PAID: "Төлбөр төлөгдсөн",
  DELIVERING: "Хүргэлтэд гарсан",
  DELIVERED: "Хүргэгдсэн",
  CANCELLED: "Цуцлагдсан",
};
export const PAYMENT_MN = { QPAY: "QPay", BANK: "Банкны шилжүүлэг", COD: "Хүргэлтээр бэлнээр" };

const site = () => siteUrl().replace(/\/$/, "");
const orderUrl = (order) => `${site()}/mn/profile/orders/${order.id}`;
const payUrl = (order) =>
  order.paymentMethod === "QPAY"
    ? `${site()}/mn/checkout/payment-pending?orderId=${order.id}`
    : `${site()}/mn/checkout/bank-transfer?orderId=${order.id}`;

/** The price one unit was sold at (older order lines have no stored price). */
const unitPriceOf = (item) => Number(item.unitPrice ?? item.product?.price ?? 0);

const button = (href, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr><td style="background:${C.ink};">
      <a href="${esc(href)}" target="_blank" rel="noopener noreferrer"
         style="display:inline-block;padding:14px 26px;font-family:${SANS};font-size:14px;font-weight:bold;color:#fbf8f3;text-decoration:none;">${esc(label)}</a>
    </td></tr>
  </table>`;

const row = (label, value, strong = false) => `
  <tr>
    <td style="padding:6px 0;font-family:${SANS};font-size:14px;color:${C.taupe};">${esc(label)}</td>
    <td style="padding:6px 0;font-family:${SANS};font-size:14px;color:${C.ink};text-align:right;${strong ? "font-weight:bold;" : ""}">${value}</td>
  </tr>`;

const section = (title, inner) => `
  <tr><td style="padding:24px 32px 0;">
    <p style="margin:0 0 8px;font-family:${SANS};font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:${C.taupe};">${esc(title)}</p>
    ${inner}
  </td></tr>`;

function itemsTable(order) {
  const items = order.orderItems ?? [];
  if (!items.length) return "";
  const lines = items
    .map((it) => {
      const unit = unitPriceOf(it);
      const qty = Number(it.quantity ?? 1);
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;color:${C.ink};">
            ${esc(it.product?.productName ?? "Бүтээгдэхүүн")}
            ${it.size ? `<br><span style="font-size:12px;color:${C.taupe};">${esc(it.size)}</span>` : ""}
            <br><span style="font-size:12px;color:${C.taupe};">${qty} × ${money(unit)}</span>
          </td>
          <td style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:14px;color:${C.ink};text-align:right;vertical-align:top;">${money(unit * qty)}</td>
        </tr>`;
    })
    .join("");
  const subtotal = items.reduce((s, it) => s + unitPriceOf(it) * Number(it.quantity ?? 1), 0);
  return section(
    "Захиалсан бараа",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${lines}</table>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
       ${row("Барааны дүн", money(subtotal))}
       ${row("Хүргэлт", money(order.deliveryFee))}
       ${row("Нийт", money(order.totalPrice), true)}
     </table>`,
  );
}

function bankBlock(order) {
  return section(
    "Төлбөрөө шилжүүлэх",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.sand};">
       <tr><td style="padding:16px 18px;">
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           ${row("Банк", esc(STORE.bank.name))}
           ${row("Хүлээн авагч", esc(STORE.bank.holder))}
           ${row("Дансны дугаар", esc(STORE.bank.account), true)}
           ${row("Шилжүүлэх дүн", money(order.totalPrice), true)}
           ${row("Гүйлгээний утга", esc(order.orderNumber), true)}
         </table>
       </td></tr>
     </table>
     <p style="margin:10px 0 0;font-family:${SANS};font-size:13px;line-height:1.6;color:${C.taupe};">
       Гүйлгээний утгад захиалгын дугаараа заавал бичнэ үү. 24 цагийн дотор шилжүүлээгүй бол захиалга автоматаар цуцлагдана. Төлбөр орсныг шалгасны дараа захиалгыг баталгаажуулна.
     </p>`,
  );
}

function deliveryBlock(order) {
  const name = [order.lastName, order.firstName].filter(Boolean).join(" ");
  const address = [order.city, order.district, order.khoroo, order.address].filter(Boolean).join(", ");
  return section(
    "Хүргэлт",
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${row("Хүлээн авагч", esc(name || "—"))}
       ${row("Утас", esc(order.phone || "—"))}
       ${row("Хаяг", esc(address || "—"))}
       ${order.notes ? row("Тайлбар", esc(order.notes)) : ""}
     </table>`,
  );
}

const COPY = {
  created: (order) => ({
    subject: `Захиалга #${order.orderNumber} хүлээн авлаа`,
    title: "Захиалга хүлээн авлаа",
    intro:
      order.status === "WAITING_PAYMENT" && order.paymentMethod === "BANK"
        ? "Баярлалаа! Захиалгаа баталгаажуулахын тулд доорх данс руу төлбөрөө шилжүүлнэ үү."
        : order.status === "WAITING_PAYMENT" && order.paymentMethod === "QPAY"
          ? "Баярлалаа! QPay-ээр төлбөрөө төлсний дараа захиалга баталгаажна."
          : "Баярлалаа! Таны захиалгыг хүлээн авлаа.",
  }),
  PAID: (order) => ({
    subject: `Төлбөр баталгаажлаа · #${order.orderNumber}`,
    title: "Төлбөр баталгаажлаа",
    intro: "Төлбөр тань орлоо. Захиалгыг бэлтгэж, хүргэлтэд гаргахад бид танд дахин мэдэгдэнэ.",
  }),
  DELIVERING: (order) => ({
    subject: `Захиалга #${order.orderNumber} хүргэлтэд гарлаа`,
    title: "Захиалга хүргэлтэд гарлаа",
    intro: "Таны захиалга замдаа гарлаа. Утсаа ойрхон байлгаарай.",
  }),
  DELIVERED: (order) => ({
    subject: `Захиалга #${order.orderNumber} хүргэгдлээ`,
    title: "Захиалга хүргэгдлээ",
    intro: "Захиалсанд баярлалаа! Бүтээгдэхүүний талаарх сэтгэгдлээ захиалгын хуудаснаас үлдээж болно.",
  }),
  CANCELLED: (order) => ({
    subject: `Захиалга #${order.orderNumber} цуцлагдлаа`,
    title: "Захиалга цуцлагдлаа",
    intro: "Таны захиалга цуцлагдлаа. Хэрэв та төлбөр төлсөн бол бидэнтэй холбогдоно уу.",
  }),
};

export const EMAIL_KINDS = Object.keys(COPY);

/** Subject + HTML for one order message. kind: "created" | "PAID" | "DELIVERING" | "DELIVERED" | "CANCELLED". */
export function orderEmail(kind, order) {
  const copy = (COPY[kind] ?? COPY.created)(order);
  const awaiting = order.status === "WAITING_PAYMENT";
  const contact = [STORE.contact.phone, STORE.contact.email].filter(Boolean).map(esc).join(" · ");
  const html = `<!doctype html>
<html lang="mn"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(copy.subject)}</title></head>
<body style="margin:0;padding:0;background:${C.paper};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.paper};">
    <tr><td align="center" style="padding:32px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${C.line};">
        <tr><td style="padding:28px 32px 0;font-family:${SERIF};font-size:28px;color:${C.ink};">${esc(STORE.name)}</td></tr>
        <tr><td style="padding:24px 32px 0;">
          <h1 style="margin:0;font-family:${SERIF};font-size:26px;font-weight:normal;color:${C.ink};">${esc(copy.title)}</h1>
          <p style="margin:10px 0 0;font-family:${SANS};font-size:15px;line-height:1.6;color:${C.ink};">${esc(copy.intro)}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
            ${row("Захиалгын дугаар", `#${esc(order.orderNumber)}`, true)}
            ${row("Төлөв", esc(STATUS_MN[order.status] ?? order.status))}
            ${row("Төлбөрийн хэлбэр", esc(PAYMENT_MN[order.paymentMethod] ?? order.paymentMethod))}
          </table>
        </td></tr>
        ${awaiting && order.paymentMethod === "BANK" ? bankBlock(order) : ""}
        ${itemsTable(order)}
        ${deliveryBlock(order)}
        <tr><td style="padding:0 32px 8px;">
          ${awaiting && order.paymentMethod === "QPAY" ? button(payUrl(order), "QPay-ээр төлөх") : button(orderUrl(order), "Захиалгаа харах")}
        </td></tr>
        <tr><td style="padding:16px 32px 28px;border-top:1px solid ${C.line};font-family:${SANS};font-size:12px;line-height:1.6;color:${C.taupe};">
          Асуух зүйл байвал: ${contact}<br>${esc(site())}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
  return { subject: copy.subject, html };
}
