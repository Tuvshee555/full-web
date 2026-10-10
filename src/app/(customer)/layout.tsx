import type { Metadata } from "next";
import { Cormorant_Garamond, Onest } from "next/font/google";
import "./globals.css";
import RootClient from "./RootClient";
import { STORE } from "@/config/store";

// Editorial beauty pairing, both with full Cyrillic (Ө/Ү live in cyrillic-ext):
// high-contrast serif for headlines, a Cyrillic-native grotesk for everything else.
const storeFont = Onest({
  variable: "--font-store",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["300", "400", "500", "600"],
});

const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: STORE.name,
  description: STORE.name,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className={`${storeFont.variable} ${displayFont.variable} store-body antialiased`}>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}
