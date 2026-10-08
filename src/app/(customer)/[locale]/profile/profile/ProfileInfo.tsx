"use client";

import { API_BASE_URL } from "@/lib/api";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { User, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../provider/AuthProvider";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { ProfileFields } from "./components/ProfileFields";

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

const REQUIRED_FIELDS: (keyof ProfileForm)[] = [
  "firstName",
  "lastName",
  "phonenumber",
  "city",
  "district",
  "khoroo",
  "address",
];

export const ProfileInfo = () => {
  const { userId, token } = useAuth();
  const { t } = useI18n();

  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState<ProfileForm>({
    firstName: "",
    lastName: "",
    phonenumber: "",
    city: "",
    district: "",
    khoroo: "",
    address: "",
    notes: "",
  });

  useEffect(() => {
    setUserEmail(localStorage.getItem("email") ?? "");
    if (!userId || !token) return;

    axios
      .get(`${API_BASE_URL}/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const u = res.data?.user;
        if (!u) return;
        setForm({
          firstName: u.firstName ?? "",
          lastName: u.lastName ?? "",
          phonenumber: u.phonenumber ?? "",
          city: u.city ?? "",
          district: u.district ?? "",
          khoroo: u.khoroo ?? "",
          address: u.address ?? "",
          notes: u.notes ?? "",
        });
      })
      .catch(() => toast.error(t("err_user_info")));
  }, [userId, token, t]);

  const update = (k: keyof ProfileForm, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  const hasErrors = useMemo(
    () => REQUIRED_FIELDS.some((k) => !form[k].trim()),
    [form]
  );

  const handleSave = async () => {
    if (hasErrors || !userId || !token) return;

    try {
      setLoading(true);
      await axios.put(
        `${API_BASE_URL}/user/${userId}`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(t("profile_saved"));
    } catch {
      toast.error(t("profile_save_error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-card rounded-2xl border border-border p-6 sm:p-8 pb-[200px] sm:pb-8">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-border">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="font-bold text-lg">{t("my_profile")}</h1>
          <p className="text-sm text-muted-foreground">{t("profile_subtitle")}</p>
        </div>
      </div>

      <ProfileFields
        form={form}
        update={update}
        touched={touched}
        setTouched={setTouched}
        email={userEmail}
      />

      {/* Save button */}
      <div className="flex justify-end pt-6 border-t border-border mt-8">
        <Button
          onClick={handleSave}
          disabled={loading || hasErrors}
          className="gap-2 px-8"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {loading ? t("saving") : t("save")}
        </Button>
      </div>
    </section>
  );
};
