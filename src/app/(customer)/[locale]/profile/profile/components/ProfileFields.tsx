"use client";

import { Input } from "@/components/ui/input";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { ProfileForm } from "../ProfileInfo";
import { Field, TextareaField } from "./ProfileInputs";

export const ProfileFields = ({
  form,
  update,
  touched,
  setTouched,
  email,
}: {
  form: ProfileForm;
  update: (k: keyof ProfileForm, v: string) => void;
  touched: Record<string, boolean>;
  setTouched: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  email: string;
}) => {
  const { t } = useI18n();

  const markTouched = (k: keyof ProfileForm) =>
    setTouched((p) => ({ ...p, [k]: true }));

  return (
    <>
      {/* Personal info */}
      <div className="space-y-6 mb-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={t("last_name")}
            required
            value={form.lastName}
            error={touched.lastName && !form.lastName}
            onBlur={() => markTouched("lastName")}
            onChange={(v: string) => update("lastName", v)}
          />

          <Field
            label={t("first_name")}
            required
            value={form.firstName}
            error={touched.firstName && !form.firstName}
            onBlur={() => markTouched("firstName")}
            onChange={(v: string) => update("firstName", v)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={t("phone")}
            required
            value={form.phonenumber}
            error={touched.phonenumber && !form.phonenumber}
            onBlur={() => markTouched("phonenumber")}
            onChange={(v: string) => update("phonenumber", v)}
            helper={t("enter_phone")}
          />

          <div>
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("email")}
            </label>
            <Input value={email} disabled className="mt-1 h-[44px]" />
          </div>
        </div>
      </div>

      {/* Delivery address section */}
      <div className="pt-4 border-t border-border space-y-6">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("delivery_address")}
        </p>

        <Field
          label={t("city")}
          required
          value={form.city}
          error={touched.city && !form.city}
          onBlur={() => markTouched("city")}
          onChange={(v: string) => update("city", v)}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <Field
            label={t("district")}
            required
            value={form.district}
            error={touched.district && !form.district}
            onBlur={() => markTouched("district")}
            onChange={(v: string) => update("district", v)}
          />

          <Field
            label={t("khoroo")}
            required
            value={form.khoroo}
            error={touched.khoroo && !form.khoroo}
            onBlur={() => markTouched("khoroo")}
            onChange={(v: string) => update("khoroo", v)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <TextareaField
            label={t("address")}
            required
            value={form.address}
            error={touched.address && !form.address}
            onBlur={() => markTouched("address")}
            onChange={(v: string) => update("address", v)}
          />

          <TextareaField
            label={t("notes")}
            value={form.notes}
            onChange={(v: string) => update("notes", v)}
          />
        </div>
      </div>
    </>
  );
};
