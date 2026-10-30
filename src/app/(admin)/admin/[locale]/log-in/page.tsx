"use client";

import { API_BASE_URL } from "@admin/lib/api";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CredentialResponse } from "@react-oauth/google";
import { toast } from "sonner";
import axios from "axios";
import { useAuth } from "@admin/provider/AuthProvider";
import { LoginForm } from "./components/LoginForm";
import { LoginImage } from "./components/LoginImage";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

export default function LogIn() {
  const router = useRouter();
  const { setAuthToken } = useAuth();
  const { locale, t } = useI18n();
  const searchParams = useSearchParams();
  const from = searchParams?.get("from");
  const destination = from?.startsWith(`/admin/${locale}/home-page`) && !from.includes("\\")
    ? from : `/admin/${locale}/home-page`;

  const [user, setUser] = useState({ email: "", password: "", role: "ADMIN" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fail = (message: string) => {
    setError(message);
    toast.error(message);
  };

  const requireAdminAccess = (role?: string) => {
    if (role === "ADMIN") return true;
    fail(t("auth.errors.not_admin"));
    return false;
  };

  const finish = (token: string, email: string, id: string) => {
    localStorage.setItem("adminToken", token);
    localStorage.setItem("adminEmail", email);
    localStorage.setItem("adminUserId", id);
    setAuthToken(token);
    toast.success(t("auth.welcome"));
    router.replace(destination);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    try {
      setLoading(true);
      const res = await axios.post(`${API_BASE_URL}/user/login`, { ...user, email: user.email.trim() });

      if (res.data.success) {
        const { token, user: userData } = res.data;
        // Same ADMIN check as Google login (password login used to skip it)
        if (!requireAdminAccess(userData?.role)) return;
        finish(token, userData.email, userData.userId || userData.id);
      } else {
        fail(t("auth.errors.generic"));
      }
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (axios.isAxiosError(err) && !err.response) fail(t("common.errors.offline"));
      else if (status === 401) fail(t("auth.errors.wrong"));
      else if (status === 403) fail(t("auth.errors.not_admin"));
      else if (status === 429) fail(t("auth.errors.too_many"));
      else fail(t("auth.errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (res: CredentialResponse) => {
    if (loading) return;
    if (!res.credential) return fail(t("auth.errors.google"));

    try {
      setLoading(true);
      setError(null);
      const r = await fetch(`${API_BASE_URL}/user/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: res.credential }),
      });

      const data = await r.json();
      if (data.token && data.user) {
        if (!requireAdminAccess(data.user.role)) return;
        finish(data.token, data.user.email, data.user.id);
      } else {
        fail(r.status === 429 ? t("auth.errors.too_many") : t("auth.errors.google"));
      }
    } catch {
      fail(t("auth.errors.google"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] w-full bg-paper text-ink lg:grid-cols-2">
      <div className="hidden lg:block">
        <LoginImage />
      </div>
      <div className="flex items-center justify-center px-[20px] py-[48px]">
        <LoginForm
          user={user}
          setUser={setUser}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          error={error}
          loading={loading}
          onLogin={handleLogin}
          onGoogle={handleGoogleLogin}
        />
      </div>
    </div>
  );
}
