import type { Metadata } from "next";
import { Source_Sans_3 } from "next/font/google";
import "./globals.css";
import RootClient from "./RootClient";
import { STORE } from "@/config/store";

// Dawn's default font (Assistant) is a Source Sans derivative without Cyrillic;
// Source Sans 3 is the same design with Cyrillic (needed for Ө/Ү).
const storeFont = Source_Sans_3({
  variable: "--font-store",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
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
      <body className={`${storeFont.variable} store-body bg-white antialiased`}>
        <RootClient>{children}</RootClient>
      </body>
    </html>
  );
}
