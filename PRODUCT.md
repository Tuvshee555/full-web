# Product

## Register

brand

The storefront is the brand register (design is the product: first impression, trust, desire). The admin (`/admin`) is the product register (a tool; it should disappear into the task). When working on admin, apply the product register: familiar patterns, density, no decoration.

## Users

- **Shoppers** in Mongolia, mostly on phones, buying eyebrow products (serum, pencils, pomade, gel, brushes, kits). They arrive from a Facebook or Instagram page, decide fast, and pay with QPay or bank transfer. Mongolian first (Cyrillic, with Ө/Ү), English second. No other languages.
- **The owner** (one person, a student) runs the shop from admin and a phone: adds products, checks orders, answers chats that the bot hands over. Not technical about design; judges the result by feel.

## Product Purpose

Lorentz sells a small, honest range of brow care and shaping products. Success: a first-time visitor trusts the shop within seconds, finds a product, and completes checkout without friction; the owner can run everything alone, including handovers from the chatbot.

## Brand Personality

Calm, precise, quietly premium. Editorial beauty (the owner chose this after Shopify-Dawn felt "off"). Voice: plain and factual, never hype. No growth or medical promises, no invented urgency, no fake discounts or reviews.

## Anti-references

- Shopify Dawn copied 1:1 (felt generic; wide Cyrillic tracking, grey low-contrast text).
- Discount-bazaar beauty sites: red banners, countdown timers, fake scarcity.
- Template AI grammar: a tiny tracked kicker above every heading, numbered 01/02/03 markers, glass cards, gradient text.
- Rounded, bubbly UI. Corners are sharp everywhere.

## Design Principles

1. **Trust before beauty.** Real prices, real stock labels, clear delivery and payment, honest empty states. Decoration never hides information.
2. **Legibility on a phone in daylight.** Body text meets WCAG AA; touch targets are at least 44px; nothing important sits under a floating button.
3. **One system.** The same component vocabulary on every screen, storefront and admin. Fix the class, not the instance.
4. **Quiet motion.** Short, ease-out, state-driven; always respects reduced motion.
5. **Photos carry the product.** Never tint or filter product photos: shade accuracy matters for pencils and pomade.

## Accessibility & Inclusion

WCAG 2.1 AA target: text contrast 4.5:1 (3:1 for large text and UI graphics), visible keyboard focus, `prefers-reduced-motion` honoured, semantic landmarks, alt text on product images. Cyrillic must render with real Ө/Ү glyphs (fonts load the `cyrillic-ext` subset).

## Fixed identity (do not redesign)

Light only. Paper `#fbf8f3`, sand `#efe7dd`, ink `#1c1714`, espresso `#2a211c`, taupe `#6f655d`, terracotta `#a8452f` (sale and attention only). Cormorant Garamond for large headings only; Onest for everything else. Radius 0.
