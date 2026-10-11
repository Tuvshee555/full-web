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

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026.10.11 20:16" */
export const formatDateTime = (iso?: string | Date | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** "10.11" for chart ticks. */
export const formatShortDate = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
};

/** YYYY-MM-DD in Ulaanbaatar time (UTC+8), matching the server's revenue buckets. */
export const ubDayKey = (d: Date) =>
  new Date(d.getTime() + 8 * 3600 * 1000).toISOString().slice(0, 10);
