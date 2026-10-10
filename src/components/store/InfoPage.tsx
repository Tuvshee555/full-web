"use client";

import type { ReactNode } from "react";
import { STORE } from "@/config/store";
import { Reveal } from "./Reveal";

/** Shared editorial layout for About / Contact / FAQ / policy pages. */
export function InfoPage({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="page-width pb-[96px] pt-[48px] md:pt-[88px]">
      <div className="grid gap-[32px] md:grid-cols-12">
        <Reveal className="md:col-span-5">
          <span className="eyebrow">{STORE.name}</span>
          <h1 className="store-heading mt-[12px] text-[52px] md:text-[80px]">{title}</h1>
          {intro && <div className="mt-[16px] max-w-[420px] text-[16px] leading-relaxed text-ink/65">{intro}</div>}
        </Reveal>
        <Reveal delay={150} className="md:col-span-6 md:col-start-7 md:pt-[24px]">
          {children}
        </Reveal>
      </div>
    </div>
  );
}
