"use client";

import type { ReactNode } from "react";
import { Reveal } from "./Reveal";

/** Shared editorial layout for About / Contact / FAQ / policy pages. */
export function InfoPage({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="page-width pb-[64px] pt-[32px] lg:pb-[88px] lg:pt-[64px]">
      <div className="grid gap-[32px] md:grid-cols-12">
        <Reveal className="md:col-span-5">
          <h1 className="store-heading page-title">{title}</h1>
          {intro && <div className="mt-[16px] max-w-[420px] text-[16px] leading-relaxed text-ink/65">{intro}</div>}
        </Reveal>
        <Reveal delay={150} className="md:col-span-6 md:col-start-7 md:pt-[24px]">
          {children}
        </Reveal>
      </div>
    </div>
  );
}
