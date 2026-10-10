"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { useStoreT } from "@/components/store/lib/useStoreT";
import { isGuestEmail } from "@/components/store/lib/product";
import { useAuth } from "../../provider/AuthProvider";

export type ProfileForm = {
  firstName: string;
  lastName: string;
  phonenumber: string;
  city: string;
  district: string;
  khoroo: string;
  address: string;
  notes: string;
};

const EMPTY: ProfileForm = { firstName: "", lastName: "", phonenumber: "", city: "", district: "", khoroo: "", address: "", notes: "" };
const REQUIRED: (keyof ProfileForm)[] = ["firstName", "lastName", "phonenumber", "city", "district", "khoroo", "address"];

/** Account details: saved delivery info, prefilled at checkout. */
export const ProfileInfo = () => {
  const { userId, token } = useAuth();
  const { t } = useI18n();
  const { st } = useStoreT();
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setEmail(localStorage.getItem("email") ?? "");
    if (!userId || !token) return;
    axios
      .get(`${API_BASE_URL}/user/${userId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const u = res.data?.user;
        if (u) setForm(Object.fromEntries(Object.keys(EMPTY).map((k) => [k, u[k] ?? ""])) as ProfileForm);
      })
      .catch(() => toast.error(t("err_user_info")));
  }, [userId, token, t]);

  const incomplete = useMemo(() => REQUIRED.some((k) => !form[k].trim()), [form]);
  const set = (k: keyof ProfileForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    if (incomplete || !userId || !token) return;
    setSaving(true);
    try {
      await axios.put(`${API_BASE_URL}/user/${userId}`, form, { headers: { Authorization: `Bearer ${token}` } });
      toast.success(t("profile_saved"));
    } catch {
      toast.error(t("profile_save_error"));
    } finally {
      setSaving(false);
    }
  };

  const field = (k: keyof ProfileForm, label: string, opts: { area?: boolean; required?: boolean } = {}) => (
    <div className="field">
      {opts.area ? (
        <textarea id={`pf-${k}`} placeholder=" " value={form[k]} onChange={set(k)} />
      ) : (
        <input id={`pf-${k}`} placeholder=" " value={form[k]} onChange={set(k)} />
      )}
      <label htmlFor={`pf-${k}`}>
        {label}
        {opts.required ? " *" : ""}
      </label>
    </div>
  );

  const isGuest = isGuestEmail(email);

  return (
    <section className="max-w-[720px]">
      <h2 className="store-heading text-[34px]">{st("details_title")}</h2>
      <p className="mt-[6px] text-[15px] text-ink/60">{st("details_sub")}</p>

      <div className="mt-[28px] grid gap-[14px] sm:grid-cols-2">
        {field("lastName", st("last_name"), { required: true })}
        {field("firstName", st("first_name"), { required: true })}
        {field("phonenumber", st("phone"), { required: true })}
        {!isGuest && (
          <div className="field">
            <input id="pf-email" placeholder=" " value={email} disabled className="opacity-60" />
            <label htmlFor="pf-email">{st("email")}</label>
          </div>
        )}
      </div>

      <p className="eyebrow mt-[32px]">{st("ship_to")}</p>
      <div className="mt-[14px] grid gap-[14px] sm:grid-cols-2">
        {field("city", t("city"), { required: true })}
        {field("district", st("district"), { required: true })}
        {field("khoroo", st("khoroo"), { required: true })}
        <div className="sm:col-span-2">{field("address", st("address"), { area: true, required: true })}</div>
        <div className="sm:col-span-2">{field("notes", st("notes"), { area: true })}</div>
      </div>

      <button type="button" onClick={save} disabled={saving || incomplete} className="btn mt-[28px] min-w-[180px]">
        {saving ? (
          <>
            <Loader2 className="h-[16px] w-[16px] animate-spin" strokeWidth={1.4} /> {st("saving")}
          </>
        ) : (
          st("save")
        )}
      </button>
    </section>
  );
};
