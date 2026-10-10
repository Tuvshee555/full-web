import type { Metadata } from "next";
import { Cormorant_Garamond, Onest } from "next/font/google";
import "./globals.css";
import Providers from "@admin/provider/Providers";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { STORE } from "@/config/store";

// Same type pairing as the storefront (both with Cyrillic incl. Ө/Ү)
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
  title: `${STORE.name} · Admin`,
  description: `${STORE.name} store admin`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className={`${storeFont.variable} ${displayFont.variable} admin-body antialiased`}>
        <GoogleOAuthProvider clientId="424549876529-sln60g4usp2b71ijfihqs96o01qhogko.apps.googleusercontent.com">
          <Providers>{children}</Providers>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
