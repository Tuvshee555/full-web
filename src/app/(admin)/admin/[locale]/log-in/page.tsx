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
  const { locale } = useI18n();
  const searchParams = useSearchParams();
  const from = searchParams?.get("from");
  const destination = from?.startsWith(`/admin/${locale}/home-page`) && !from.includes("\\")
    ? from : `/admin/${locale}/home-page`;

  const [user, setUser] = useState({ email: "", password: "", role: "ADMIN" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requireAdminAccess = (role?: string) => {
    if (role === "ADMIN") return true;
    const message = "This account does not have ADMIN access!";
    setError(message);
    toast.error(message);
    return false;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);

    try {
      setLoading(true);
      const res = await axios.post(
        `${API_BASE_URL}/user/login`,
        user
      );

      if (res.data.success) {
        const { token, user: userData } = res.data;
        // Same ADMIN check as Google login (password login used to skip it)
        if (!requireAdminAccess(userData?.role)) return;
        localStorage.setItem("adminToken", token);
        localStorage.setItem("adminEmail", userData.email);
        localStorage.setItem("adminUserId", userData.userId || userData.id);
        setAuthToken(token);
        toast.success("Successfully logged in!");
        router.replace(destination);
      } else {
        setError(res.data.message);
        toast.error(res.data.message);
      }
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const msg =
          err.response?.data?.message || "An error occurred while logging in.";
        setError(msg);
        toast.error(msg);
      } else {
        toast.error("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (res: CredentialResponse) => {
    if (loading) return;
    if (!res.credential) return toast.error("No Google credentials received!");

    try {
      setLoading(true);
      const r = await fetch(
        `${API_BASE_URL}/user/auth/google`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: res.credential }),
        }
      );

      const data = await r.json();
      if (data.token && data.user) {
        if (!requireAdminAccess(data.user.role)) return;
        localStorage.setItem("adminToken", data.token);
        localStorage.setItem("adminEmail", data.user.email);
        localStorage.setItem("adminUserId", data.user.id);
        setAuthToken(data.token);
        toast.success("Successfully logged in with Google!");
        router.replace(destination);
      } else {
        toast.error(data.message || "Google login failed!");
      }
    } catch {
      toast.error("Google login failed!");
    } finally { setLoading(false); }
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
