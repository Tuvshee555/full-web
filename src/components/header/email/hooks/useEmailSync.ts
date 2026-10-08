"use client";

import { useEffect, useState } from "react";

export const useEmailSync = () => {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setEmail(localStorage.getItem("email"));
    sync();
    window.addEventListener("auth-changed", sync);
    return () => window.removeEventListener("auth-changed", sync);
  }, []);

  return email;
};
