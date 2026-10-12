export function formatTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const hm = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, now)) return `Өнөөдөр ${hm}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(date, yesterday)) return `Өчигдөр ${hm}`;
  const md = `${date.getMonth() + 1} сарын ${date.getDate()}`;
  if (date.getFullYear() === now.getFullYear()) return `${md}, ${hm}`;
  return `${date.getFullYear()} оны ${md}`;
}

export function shortId(value: string | null | undefined) {
  if (!value) return "—";
  return value.length <= 14 ? value : `…${value.slice(-12)}`;
}

export function timeLeft(expiresAt: string | null) {
  if (!expiresAt) return "гараар сэргээнэ";
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Дууссан";
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return minutes <= 0 ? `${seconds}с` : `${minutes}м ${seconds}с`;
}

