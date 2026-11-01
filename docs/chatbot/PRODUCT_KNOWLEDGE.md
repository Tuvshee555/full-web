# What the assistant knows, and what the owner must supply

The assistant answers only from these sources. Anything else it says is "not published yet" plus the
team's contact details, never a guess.

| Fact | Source | Who changes it |
| --- | --- | --- |
| Product name, price, old price, discount, variants (shades, sizes), stock | `Product` / `ProductSize` tables | Admin → Products (immediately live) |
| Volume (ml / g), how to use, ingredient list, safety note, per-product FAQ | `Product.volume / howToUse / ingredientList / safetyNotes / faq` | Admin → Products → "Product facts" section |
| Shop questions and answers (opening hours, pickup, gifts, …) | `ChatFaq` table | Admin → Chat assistant → Knowledge |
| Delivery days, returns, safety wording | `POLICIES` in `src/config/store-data.mjs` (shared with the Terms page) | Code change |
| Delivery fee | `DELIVERY_FEE` environment variable | Deployment settings |
| Payment methods, bank account, contact | `STORE` in `src/config/store-data.mjs` | Code change |
| Greeting, hand-off text, extra free-text notes | `ChatSettings` | Admin → Chat assistant → Settings |

## Missing today (live catalogue, 1 November 2026)

None of the 10 products has a published volume (one size label such as "5 мл" counts), usage steps,
ingredient list, safety note or FAQ. Until the owner fills them in, these customer questions get an
honest "not published yet" with the contact line:

- "Яаж хэрэглэх вэ?", "Өдөрт хэдэн удаа?", "Хэдий хугацаанд?" (how to use, frequency, duration)
- "Найрлага юу вэ?" (ingredients)
- "Хэдэн мл вэ?" for products whose size label does not carry the volume

The Knowledge tab lists each product with what is still missing and a direct link to its editor.

## Claims policy (cannot be overridden by any field)

- No growth, timeframe, medical or "clinically proven" claims; the settings and FAQ editors refuse
  text with "₮", percentages or guaranteed results, and the reply verifier rejects such sentences.
- Pregnancy, breastfeeding, allergies: "ask your doctor" plus the published patch-test advice.
- Redness, itching, swelling: stop use, rinse, see a doctor; the conversation is flagged for staff.
- Payment is never confirmed by the assistant.
