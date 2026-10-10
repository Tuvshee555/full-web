"use client";

import { STORE } from "@/config/store";

/** Editorial brand panel for the admin login (replaces the food-delivery illustration). */
export const LoginImage = () => (
  <div className="relative flex h-full min-h-[100dvh] flex-col justify-between overflow-hidden bg-espresso p-[48px] text-paper">
    <span className="eyebrow !text-paper/45">Admin</span>
    <div>
      <p className="store-heading !text-paper text-[96px] leading-[0.9]">{STORE.name}</p>
      <p className="display-italic mt-[16px] max-w-[360px] text-[24px] leading-snug text-paper/70">
        {STORE.name} · {new Date().getFullYear()}
      </p>
    </div>
    <p className="store-heading pointer-events-none absolute -bottom-[0.25em] -right-[0.05em] select-none text-[34vw] leading-none !text-paper/[0.05]" aria-hidden>
      {STORE.name[0]}
    </p>
  </div>
);
