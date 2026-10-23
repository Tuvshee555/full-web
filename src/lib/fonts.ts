// The store's two typefaces, loaded once for the whole app. The storefront and the admin are separate
// root layouts, and Next preloads the fonts of BOTH on every page, so they must use identical settings
// here: a second, slightly different configuration doubles the font files every phone downloads.
// Both have full Cyrillic (Ө/Ү live in cyrillic-ext). next/font reads these options at build time,
// so they have to stay literal values (no shared variables).
import { Cormorant_Garamond, Onest } from "next/font/google";

/** Text: a Cyrillic-native grotesk. */
export const storeFont = Onest({
  variable: "--font-store",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["300", "400", "500", "600"],
});

/** Headlines: a high-contrast serif. */
export const displayFont = Cormorant_Garamond({
  variable: "--font-display",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["500"],
  style: ["normal"],
});

// The italic only sets one footer line and the About intro. It loads quietly, after the page, so its
// three font files (~85 KB) do not compete with the headline font and the photos for a phone's bandwidth.
export const displayItalic = Cormorant_Garamond({
  variable: "--font-display-italic",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400"],
  style: ["italic"],
  preload: false,
});
