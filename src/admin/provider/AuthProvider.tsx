"use client";

import React, { useState, createContext, useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useJwt } from "react-jwt";
import { toast } from "sonner";

type UserType = {
  userId?: string;
  id?: string;
  role?: string;
};

type AuthContextType = {
  userId?: string;
  role?: string;
  token?: string | null;
  setAuthToken: (newToken: string | null) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const { decodedToken, reEvaluateToken, isExpired } = useJwt<UserType>(
    token || ""
  );

  // Load token from storage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("adminToken");

    if (!storedToken) {
      router.push("/admin/log-in");
      return;
    }

    setToken(storedToken);
    reEvaluateToken(storedToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect when token becomes expired (fires whenever isExpired changes)
  useEffect(() => {
    if (isExpired) {
      localStorage.removeItem("adminToken");
      document.cookie = "adminToken=; path=/; max-age=0; SameSite=Strict";
      router.push("/admin/log-in");
    }
  }, [isExpired, router]);

  useEffect(() => {
    if (token && decodedToken && decodedToken.role !== "ADMIN") {
      localStorage.removeItem("adminToken");
      document.cookie = "adminToken=; path=/; max-age=0; SameSite=Strict";
      setToken(null);
      toast.error("Admin access required");
      router.push("/admin/log-in");
    }
  }, [decodedToken, router, token]);

  const setAuthToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem("adminToken", newToken);
      // Mirror the token into a cookie so it's available outside React if a
      // server-side guard is added later. NOTE: route protection today is
      // client-side (this provider) only; the real authorization boundary is
      // the backend, which enforces requireAdmin on every admin endpoint.
      document.cookie = `adminToken=${newToken}; path=/; SameSite=Strict`;
      setToken(newToken);
      reEvaluateToken(newToken);
    } else {
      localStorage.removeItem("adminToken");
      // Clear the middleware cookie on logout
      document.cookie = "adminToken=; path=/; max-age=0; SameSite=Strict";
      setToken(null);
      router.push("/admin/log-in");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        userId: decodedToken?.userId ?? decodedToken?.id,
        role: decodedToken?.role,
        token,
        setAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
