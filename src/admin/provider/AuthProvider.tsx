"use client";

import React, { useState, createContext, useContext, useEffect, useCallback, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { decodeToken, isExpired } from "react-jwt";
import { useI18n } from "@admin/components/i18n/ClientI18nProvider";

type UserType = {
  userId?: string;
  id?: string;
  role?: string;
  exp?: number;
};

type AuthContextType = {
  userId?: string;
  role?: string;
  token: string | null;
  setAuthToken: (newToken: string | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

function validAdmin(token: string | null): UserType | null {
  if (!token || isExpired(token)) return null;
  const user = decodeToken<UserType>(token);
  return user?.role === "ADMIN" ? user : null;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { locale, t } = useI18n();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const user = useMemo(() => validAdmin(token), [token]);
  const publicPage = /\/(log-in|forgot-password|reset-password|sign-up)\/?$/.test(pathname ?? "");
  const loginPath = `/admin/${locale}/log-in`;

  const persist = useCallback((value: string | null) => {
    if (value) {
      localStorage.setItem("adminToken", value);
      // UI route hint only. Every API independently verifies the bearer token.
      document.cookie = `adminToken=${value}; path=/; SameSite=Strict${location.protocol === "https:" ? "; Secure" : ""}`;
    } else {
      for (const key of ["adminToken", "adminEmail", "adminUserId", "adminUser"]) localStorage.removeItem(key);
      document.cookie = "adminToken=; path=/; max-age=0; SameSite=Strict";
    }
    setToken(value);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem("adminToken");
    persist(validAdmin(stored) ? stored : null);
    setReady(true);
    const onStorage = (event: StorageEvent) => {
      if (event.key === "adminToken" || event.key === null) {
        const next = localStorage.getItem("adminToken");
        persist(validAdmin(next) ? next : null);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [persist]);

  useEffect(() => {
    if (ready && !publicPage && !user) router.replace(loginPath);
  }, [ready, publicPage, user, router, loginPath]);

  useEffect(() => {
    if (!user?.exp) return;
    const expire = () => persist(null);
    const remaining = user.exp * 1000 - Date.now();
    const timer = window.setTimeout(expire, Math.max(0, Math.min(remaining, 2_147_483_647)));
    const onFocus = () => { if (!validAdmin(token)) expire(); };
    window.addEventListener("focus", onFocus);
    return () => { window.clearTimeout(timer); window.removeEventListener("focus", onFocus); };
  }, [user, token, persist]);

  const setAuthToken = (value: string | null) => {
    const next = validAdmin(value) ? value : null;
    persist(next);
    if (!next) router.replace(loginPath);
  };

  return (
    <AuthContext.Provider
      value={{
        userId: user?.userId ?? user?.id,
        role: user?.role,
        token,
        setAuthToken,
      }}
    >
      {publicPage || (ready && user) ? children : <div role="status" className="flex min-h-screen items-center justify-center bg-paper px-6 text-sm text-taupe">{t("common.loading")}</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
