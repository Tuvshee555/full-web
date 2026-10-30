/** 59900 -> "59,900₮" (same style as the storefront). */
export const formatMNT = (value: number | string | null | undefined) =>
  `${Math.round(Number(value) || 0).toLocaleString("en-US")}₮`;

/** 120000 -> "120k₮"; for chart axes. */
export const formatMNTCompact = (value: number) =>
  value >= 1_000_000
    ? `${+(value / 1_000_000).toFixed(1)}M₮`
    : value >= 1_000
    ? `${Math.round(value / 1_000)}k₮`
    : `${value}₮`;

/** 1234 -> "1,234" */
export const formatNumber = (value: number | null | undefined) =>
  Math.round(Number(value) || 0).toLocaleString("en-US");

const pad = (n: number) => String(n).padStart(2, "0");
const UB_OFFSET = 8 * 3600 * 1000;

/** "2026.10.11 20:16" in the store's Ulaanbaatar business timezone. */
export const formatDateTime = (iso?: string | Date | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const local = new Date(d.getTime() + UB_OFFSET);
  return `${local.getUTCFullYear()}.${pad(local.getUTCMonth() + 1)}.${pad(local.getUTCDate())} ${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
};

/**
 * "Today 20:16", "Yesterday 14:02", "10.11 20:16" or "2025.10.11" (Ulaanbaatar time).
 * Pass the translated words for today/yesterday.
 */
export const formatWhen = (
  iso: string | Date | null | undefined,
  words: { today: string; yesterday: string },
  now = new Date()
) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const local = new Date(d.getTime() + UB_OFFSET);
  const time = `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
  const day = ubDayKey(d);
  if (day === ubDayKey(now)) return `${words.today} ${time}`;
  if (day === ubDayKey(new Date(now.getTime() - 86_400_000))) return `${words.yesterday} ${time}`;
  if (local.getUTCFullYear() === new Date(now.getTime() + UB_OFFSET).getUTCFullYear()) {
    return `${pad(local.getUTCMonth() + 1)}.${pad(local.getUTCDate())} ${time}`;
  }
  return `${local.getUTCFullYear()}.${pad(local.getUTCMonth() + 1)}.${pad(local.getUTCDate())}`;
};

/** Minutes/hours since a moment, for "4 min ago" labels. */
export const elapsed = (iso: string | Date | null | undefined, now = Date.now()) => {
  const at = iso ? new Date(iso).getTime() : NaN;
  if (Number.isNaN(at)) return null;
  const minutes = Math.max(0, Math.floor((now - at) / 60_000));
  return { minutes, hours: Math.floor(minutes / 60), days: Math.floor(minutes / 1440) };
};

/** "10.11" for chart ticks. */
export const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getUTCMonth() + 1)}.${pad(d.getUTCDate())}`;
};

const MN_WEEKDAYS = ["Ням", "Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба"];

/**
 * "Thursday, 30 October 2026" / "2026 оны 10-р сарын 30, Пүрэв гараг", in Ulaanbaatar time.
 * Mongolian is written out here: many browsers ship no Mongolian date names and fall back to English.
 */
export const formatLongDate = (date: Date, locale: string) => {
  if (locale === "mn") {
    const local = new Date(date.getTime() + UB_OFFSET);
    return `${local.getUTCFullYear()} оны ${local.getUTCMonth() + 1}-р сарын ${local.getUTCDate()}, ${MN_WEEKDAYS[local.getUTCDay()]} гараг`;
  }
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ulaanbaatar",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

/** YYYY-MM-DD in Ulaanbaatar time (UTC+8), matching the server's revenue buckets. */
export const ubDayKey = (d: Date) =>
  new Date(d.getTime() + UB_OFFSET).toISOString().slice(0, 10);

/** Guest checkouts get a made-up address that must not be shown as a customer's email. */
export const isGuestEmail = (email?: string | null) =>
  !email || /^guest-.*@guest\.(com|invalid)$/i.test(email.trim());
