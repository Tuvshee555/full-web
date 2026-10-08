"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useI18n } from "@/components/i18n/ClientI18nProvider";
import { ProfileSidebar } from "./components/ProfileSidebar";
import { ProfileContent } from "./components/ProfileContent";

/* ---------------- types ---------------- */
export type Tab = "dashboard" | "profile" | "orders" | "tickets";

/* ---------------- component ---------------- */
export default function ProfileInner() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const [skeleton, setSkeleton] = useState(true);

  useEffect(() => {
    const id = setTimeout(() => setSkeleton(false), 200);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    setEmail(localStorage.getItem("email") ?? "");

    const tab = searchParams.get("tab") as Tab | null;
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    router.replace(`/${locale}/profile?tab=${tab}`);
  };

  const logout = () => {
    localStorage.clear();
    toast.success(t("logout_success"));
    router.push(`/${locale}`);
  };

  return (
    <main
      className="
  min-h-screen
  bg-background text-foreground
  pt-0 pb-0
  sm:pt-[120px] sm:pb-20
"
    >
      <div className="max-w-6xl mx-auto lg:px-6 flex flex-col lg:flex-row gap-6 lg:gap-8">
        <ProfileSidebar
          email={email}
          activeTab={activeTab}
          skeleton={skeleton}
          onChangeTab={changeTab}
          onLogout={logout}
        />

        <ProfileContent activeTab={activeTab} onChangeTab={changeTab} />
      </div>
    </main>
  );
}
