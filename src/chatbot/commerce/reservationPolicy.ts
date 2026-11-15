/**
 * The chat order reservation policy, pure (no database): read from the owner's settings with the
 * approved defaults (2026-11-02): a 60-minute hold, one unpaid chat order per phone number, five
 * units of one option per chat order. The engine (purchase.ts) uses the quantity cap and the hold
 * length for its replies; the order adapter (placeOrder.ts) enforces all three server-side.
 */
import type { Locale } from "../types";

export const DEFAULT_RESERVATION_MINUTES = 60;
export const DEFAULT_MAX_ACTIVE_PER_PHONE = 1;
export const DEFAULT_MAX_QUANTITY_PER_ITEM = 5;

export type ReservationPolicy = { minutes: number; maxActivePerPhone: number; maxQuantityPerItem: number };
type PolicySettings = { chatReservationMinutes?: number | null; chatMaxActiveReservationsPerPhone?: number | null; chatMaxQuantityPerItem?: number | null } | null | undefined;

/** The owner's policy with safe defaults for missing or malformed values. */
export function reservationPolicy(settings: PolicySettings): ReservationPolicy {
  const whole = (value: unknown, fallback: number, min: number, max: number) => {
    const n = Number(value);
    return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
  };
  return {
    minutes: whole(settings?.chatReservationMinutes, DEFAULT_RESERVATION_MINUTES, 5, 1440),
    maxActivePerPhone: whole(settings?.chatMaxActiveReservationsPerPhone, DEFAULT_MAX_ACTIVE_PER_PHONE, 1, 10),
    maxQuantityPerItem: whole(settings?.chatMaxQuantityPerItem, DEFAULT_MAX_QUANTITY_PER_ITEM, 1, 50),
  };
}

/** "60 минут" / "2 цаг" / "90 minutes", for the order summary and confirmation. */
export function reservationWindowText(minutes: number, locale: Locale): string {
  const whole = Math.max(1, Math.round(minutes));
  if (whole >= 120 && whole % 60 === 0) return locale === "en" ? `${whole / 60} hours` : `${whole / 60} цаг`;
  return locale === "en" ? `${whole} minute${whole === 1 ? "" : "s"}` : `${whole} минут`;
}
