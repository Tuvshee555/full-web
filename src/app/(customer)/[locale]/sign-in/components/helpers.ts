/* eslint-disable @typescript-eslint/no-unused-vars */
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { FacebookAuthResponse, GoogleLoginPayload } from "./type";

export const storeAuth = (token: string, email: string, userId: string) => {
  localStorage.setItem("token", token);
  localStorage.setItem("email", email);
  localStorage.setItem("userId", userId);
};

export const notifyAuth = () => {
  window.dispatchEvent(new Event("auth-changed"));
};

/* GOOGLE LOGIN */
export const googleLogin = async (
  payload: GoogleLoginPayload,
  redirectUrl: string,
  push: (url: string) => void
) => {
  if (!payload.credential) return toast.error("Google credential missing");

  try {
    const res = await fetch(
      `${API_BASE_URL}/user/auth/google`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: payload.credential,
          role: "USER",
        }),
      }
    );

    const data = await res.json();
    if (!res.ok) return toast.error(data.message || "Google login failed");

    storeAuth(data.token, data.user.email, data.user.id);
    notifyAuth();

    toast.success("Google-р нэвтэрлээ!");
    setTimeout(() => push(redirectUrl), 150);
  } catch {
    toast.error("Google login error");
  }
};

/* FACEBOOK LOGIN */
export const facebookLogin = async (
  response: FacebookAuthResponse,
  redirectUrl: string,
  push: (url: string) => void
) => {
  if (!response.authResponse) return toast.error("Facebook login cancelled");

  const token = response.authResponse.accessToken;

  try {
    const res = await fetch(
      `${API_BASE_URL}/user/auth/facebook`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      }
    );
    const data = await res.json();

    if (!res.ok || !data.token) return toast.error("Facebook login failed");

    storeAuth(data.token, data.user.email, data.user.id);
    notifyAuth();

    toast.success("Facebook-р нэвтэрлээ!");
    setTimeout(() => push(redirectUrl), 150);
  } catch {
    toast.error("Facebook login error");
  }
};

/* GUEST LOGIN */
/* client helper - guest login */

export const guestLogin = async (
  redirectUrl: string,
  push: (url: string) => void
) => {
  // make a stable guestId (so the same guest persists)
  let guestId = localStorage.getItem("userId");
  if (!guestId || !guestId.startsWith("guest-")) {
    guestId = "guest-" + crypto.randomUUID();
    localStorage.setItem("userId", guestId);
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/user/guest`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestId }),
      }
    );

    const data = await res.json();
    if (!res.ok || !data.token) {
      // console.error("Guest login failed:", data);
      return toast.error("Failed to create guest account");
    }

    // store the server-issued JWT and user info
    localStorage.setItem("token", data.token);
    localStorage.setItem("userId", data.user.id);
    localStorage.setItem("email", data.user.email ?? "Guest User");
    localStorage.setItem("guest", "true");

    // notify existing listener (your AuthProvider listens for this)
    window.dispatchEvent(new Event("auth-changed"));

    toast.success("Зочноор нэвтэрлээ!");
    push(redirectUrl);
  } catch (err) {
    // console.error("guestLogin error:", err);
    toast.error("Failed to create guest account");
  }
};
