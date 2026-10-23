import type { Metadata } from "next";
import "./globals.css";
import Providers from "@admin/provider/Providers";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { STORE } from "@/config/store";
import { displayFont, storeFont } from "@/lib/fonts";

export const metadata: Metadata = {
  title: `${STORE.name} · Admin`,
  description: `${STORE.name} store admin`,
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn" suppressHydrationWarning>
      <body className={`${storeFont.variable} ${displayFont.variable} admin-body antialiased`}>
        <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
          <Providers>{children}</Providers>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
