/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import {
  AIMAG_DISTRICTS,
  AIMAGS,
  DELIVERY_ZONE_OPTIONS,
  ULAANBAATAR_DISTRICTS,
} from "@/data/mongoliaLocations";

export type DeliveryFormData = {
  deliveryZone?: "UB" | "RURAL";
  firstName?: string;
  lastName?: string;
  phonenumber?: string;
  city?: string;
  district?: string;
  khoroo?: string;
  address?: string;
  notes?: string;
};

interface DeliveryFormProps {
  form: DeliveryFormData;
  setForm: React.Dispatch<React.SetStateAction<DeliveryFormData>>;
  errors: Record<string, boolean>;
}

export default function DeliveryForm({
  form,
  setForm,
  errors,
}: DeliveryFormProps) {
  const { t } = useI18n();

  const handleChange = (key: keyof DeliveryFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const zone = form.deliveryZone ?? "UB";
  const cityOptions = zone === "UB" ? ["Улаанбаатар"] : AIMAGS;
  const districtOptions =
    zone === "UB"
      ? ULAANBAATAR_DISTRICTS
      : AIMAG_DISTRICTS[form.city ?? ""] ?? [];

  // SAME SIZE/WEIGHT — only color change
  const labelClass = (error?: boolean) =>
    `text-sm ${error ? "text-destructive" : "text-foreground"}`;

  // No grey inputs
  const inputClass = (error?: boolean) =>
    `mt-1 h-[44px] bg-background border-border text-foreground placeholder:text-muted-foreground
     focus-visible:ring-ring ${
       error ? "border-destructive focus-visible:ring-destructive" : ""
     }`;

  return (
    <section className="bg-card rounded-2xl p-6 space-y-8">
      {/* Customer info */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">
          {t("customer_info")}
        </h2>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass(errors.firstName as any)}>
              {t("first_name")}
            </label>
            <Input
              value={form.firstName ?? ""}
              onChange={(e) => handleChange("firstName", e.target.value)}
              className={inputClass(errors.firstName as any)}
            />
          </div>

          <div>
            <label className={labelClass(errors.lastName as any)}>
              {t("last_name")}
            </label>
            <Input
              value={form.lastName ?? ""}
              onChange={(e) => handleChange("lastName", e.target.value)}
              className={inputClass(errors.lastName as any)}
            />
          </div>

          <div>
            <label className={labelClass(errors.phonenumber)}>
              {t("phone_number")} *
            </label>
            <Input
              value={form.phonenumber ?? ""}
              onChange={(e) => handleChange("phonenumber", e.target.value)}
              className={inputClass(errors.phonenumber)}
            />
          </div>
        </div>
      </div>

      {/* Delivery info */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold border-b border-border pb-2">
          {t("delivery_info")}
        </h2>

        <div className="space-y-2">
          <p className={labelClass()}>{t("delivery_zone", "Хүргэлтийн бүс")} *</p>
          <div className="grid md:grid-cols-2 gap-3">
            {DELIVERY_ZONE_OPTIONS.map((option) => {
              const active = zone === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      deliveryZone: option.value,
                      city: option.value === "UB" ? "Улаанбаатар" : prev.city,
                      district:
                        option.value === "UB"
                          ? ULAANBAATAR_DISTRICTS[0]
                          : "",
                    }))
                  }
                  className={`h-[44px] rounded-md border px-3 text-left text-sm transition ${
                    active
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass(errors.city)}>{t("city")} *</label>
            <select
              value={form.city ?? (zone === "UB" ? "Улаанбаатар" : "")}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  city: e.target.value,
                  district: "",
                }))
              }
              className={`${inputClass(errors.city)} w-full px-3`}
            >
              <option value="">{t("select_city", "Хот / аймаг сонгох")}</option>
              {cityOptions.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelClass(errors.district)}>
              {t("district")} *
            </label>
            <select
              value={form.district ?? ""}
              onChange={(e) => handleChange("district", e.target.value)}
              className={`${inputClass(errors.district)} w-full px-3`}
            >
              <option value="">{t("select_district", "Дүүрэг / сум сонгох")}</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass(errors.khoroo)}>{t("khoroo")} *</label>
            <Input
              value={form.khoroo ?? ""}
              onChange={(e) => handleChange("khoroo", e.target.value)}
              className={inputClass(errors.khoroo)}
            />
          </div>

          <div>
            <label className={labelClass(errors.address)}>
              {t("address")} *
            </label>
            <Textarea
              value={form.address ?? ""}
              onChange={(e) => handleChange("address", e.target.value)}
              className={`mt-1 h-[90px] bg-background border-border text-foreground focus-visible:ring-ring ${
                errors.address
                  ? "border-destructive focus-visible:ring-destructive"
                  : ""
              }`}
            />
          </div>
        </div>
      </div>

      {/* Additional info */}
      <div>
        <label className="text-sm text-foreground">
          {t("additional_info")}
        </label>
        <Textarea
          value={form.notes ?? ""}
          onChange={(e) => handleChange("notes", e.target.value)}
          className="mt-1 h-[90px] bg-background border-border text-foreground focus-visible:ring-ring"
        />
      </div>
    </section>
  );
}
