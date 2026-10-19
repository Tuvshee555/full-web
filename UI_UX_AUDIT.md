# Lorentz UI/UX audit — 18 October 2026

## Scope

Customer home, collections, product detail, cart, checkout, QPay, bank transfer,
order detail, account, sign-in, contact, about and FAQ. Mongolian and English.
This initial visual pass covered admin navigation, shared controls and sign-in.
The later [application pass](APPLICATION_AUDIT.md) also exercised authenticated
admin products, orders, revenue and inbox workflows with API fixtures.

The existing light palette, sharp corners, Onest body type and Cormorant display
type are preserved.

## Findings and changes

| Finding | Change |
| --- | --- |
| Phone payment page lacked a clear hierarchy; narrow desktop columns squeezed QR instructions. | Shared payment panel with a prominent bank-app action, centered QR alternative and instructions that respond to the panel's actual width. SVG keeps QR edges sharp. |
| Desktop checkout spread across two oversized, uneven page halves. | Bounded two-column layout, consistent header, readable form column and sticky order summary. Mobile summary stays collapsible. |
| Large Cyrillic headings and long contact details strained narrow layouts. | Fluid heading sizes, simpler product titles, wrapping contact details and consistent page gutters. |
| Cart table forced product image, title, quantity and total into a narrow row. | Responsive cart list with a separate order summary, wrapping controls and visible remove actions. |
| Tablet navigation switched to desktop before its links could fit comfortably. | Desktop navigation and admin sidebar begin at 1024px; smaller screens use drawers. |
| Hidden entrance animations delayed useful content; moving announcements repeated information. | Content is immediately visible, facts are static and transitions are shorter. Reduced-motion preferences are honored. |
| Drawers, search and email authentication lacked consistent focus behavior. | Radix dialogs provide focus containment, scroll locking, Escape dismissal and focus restoration. Empty cart drawers have a close control. |
| Google sign-in used fixed iframe widths. | Shared component measures available width before rendering Google's button. |
| Inputs and actions were inconsistent on touch screens. | Larger form text and controls, 44px shared touch targets, stronger field/error associations and clearer checkout sections. |
| Chat could obstruct payment or tablet purchase controls. | Chat is removed from checkout and lifts above the product purchase bar through tablet sizes. |
| Loading failures could appear as an empty catalogue or an endless payment screen. | Catalogue retry controls, explicit missing-order state, payment loading state and invoice retry. |
| Sale comparison prices and decorative footer text failed contrast checks. | Stronger price contrast and a cleaner footer without the faint oversized wordmark. |

## Verification

- Production browser sweep: 14 customer routes × 2 languages × 5 viewport widths
  (320, 390, 768, 1024 and 1440px), 140 checks. No document horizontal overflow
  or uncaught page errors.
- Browser interactions: menu focus containment/restoration, Escape dismissal,
  search results, mobile sort/filter application, cart quantity/removal, empty
  cart dismissal, checkout validation and payment summary expansion.
- QPay fixtures: pending, paid, expired and invoice-creation failure. No live
  payment or customer order was created.
- Axe WCAG A/AA rule scans on 12 representative pages, including populated
  customer screens and admin sign-in: no violations in the tested states.
- `npm run lint`, `npm run typecheck`, `git diff --check` and `npx next build` pass.

The initial pass encountered a Windows Prisma engine DLL lock and validated
Next.js using the existing client. The final application pass subsequently
passed the complete `npm run build`, including Prisma generation. The database
schema remains unchanged; the later application pass improves payment API
correctness as documented separately.

Automated scans supplement browser review; they do not certify every interaction
or assistive-technology combination. Payment verification used intercepted API
fixtures, and Google authentication was checked for layout, not a real login.
