/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useState, createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useJwt } from "react-jwt";
import { useI18n } from "@/components/i18n/ClientI18nProvider";

type UserType = { id?: string; userId?: string };

type AuthContextType = {
  userId: string | null;
  token: string | null;
  email: string | null;
  setAuthToken: (token: string | null, email?: string | null) => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const { locale } = useI18n();

  const [token, setToken] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { decodedToken, reEvaluateToken } = useJwt<UserType>(token || "");

  /* ---------- INITIAL HYDRATION ---------- */
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUserId = localStorage.getItem("userId");
    const storedEmail = localStorage.getItem("email");

    if (storedToken) {
      setToken(storedToken);
      reEvaluateToken(storedToken);
    }

    if (storedUserId) setUserId(storedUserId);
    if (storedEmail) setEmail(storedEmail);

    setLoading(false);
  }, []);

  /* ---------- DECODE JWT ---------- */
  useEffect(() => {
    if (!token || !decodedToken) return;

    setUserId(decodedToken.id || decodedToken.userId || null);
  }, [token, decodedToken]);

  /* ---------- GLOBAL AUTH SYNC ---------- */
  useEffect(() => {
    const handler = () => {
      const newToken = localStorage.getItem("token");
      const newUserId = localStorage.getItem("userId");
      const newEmail = localStorage.getItem("email");

      if (newToken) {
        setToken(newToken);
        reEvaluateToken(newToken);
      } else {
        setToken(null);
        setUserId(null);
        setEmail(null);
      }

      setUserId(newUserId || null);
      setEmail(newEmail || null);
    };

    window.addEventListener("auth-changed", handler);
    return () => window.removeEventListener("auth-changed", handler);
  }, []);

  /* ---------- SINGLE SOURCE OF TRUTH ---------- */
  const setAuthToken = (newToken: string | null, newEmail?: string | null) => {
    if (newToken) {
      localStorage.setItem("token", newToken);
      setToken(newToken);
      reEvaluateToken(newToken);

      if (newEmail) {
        localStorage.setItem("email", newEmail);
        setEmail(newEmail);
      }

      window.dispatchEvent(new Event("auth-changed"));
      return;
    }

    // logout
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("email");

    setToken(null);
    setUserId(null);
    setEmail(null);

    window.dispatchEvent(new Event("auth-changed"));
    router.push(`/${locale}/sign-in`);
  };

  return (
    <AuthContext.Provider
      value={{
        userId,
        token,
        email,
        setAuthToken,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
};
