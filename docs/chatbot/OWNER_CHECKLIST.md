# Owner checklist: product information the chatbot needs (1 November 2026)

The chatbot only repeats what is published. Nothing below was invented to fill a gap; every empty
item makes the chatbot say "not published yet" and give the shop's phone and email.

## First: the current catalogue is starter content

All 10 products were created on 2026-10-10 by the starter-catalogue script
(`scripts/seed-eyebrow-catalog.mjs`) and none has been edited since. Their descriptions, the
"how to use" sentences inside them, the sizes, the prices and the photos (Unsplash stock images) are
placeholders, not facts about real Lorentz products. The chatbot and the product pages already
show them to customers. Please check each one against the real product before anything else.

Two placeholder sentences need particular care:

- **Хөмсөгний тос** says it nourishes brows *and lashes* and is applied before bed. Lash use is near
  the eye: confirm the manufacturer allows it, or remove "сормуус".
- **Хөмсөгний сэрум** says to apply every evening and keep it out of the eyes. Confirm against the
  real packaging.

## Per product (fill in Admin → Products → open product → "Product facts")

The fields appear after the branch is deployed (migration `20261101120000_chatbot_knowledge_orders`).

| Product | Volume / weight | How to use, how often, how long | Ingredients (INCI) | Safety note | Customer FAQ | Stock count |
| --- | --- | --- | --- | --- | --- | --- |
| Хөмсөгний сэрум | "5 мл" size label: confirm | Missing | Missing | Missing | Missing | Not tracked |
| Хөмсөгний тос | "10 мл" size label: confirm | Missing | Missing | Missing (lash claim above) | Missing | Not tracked |
| Тунгалаг хөмсөгний гель | Missing ("6 мл" only in the description) | Missing | Missing | Missing | Missing | Not tracked |
| Хөмсөгний помад | Missing (weight) | Missing | Missing | Missing | Missing | 3 shades, not tracked |
| Нарийн үзүүртэй хөмсөгний харандаа | Missing | Missing | Missing | Missing | Missing | 3 shades, not tracked |
| Модон хөмсөгний харандаа | Missing | Missing | Missing | Missing | Missing | 3 shades, not tracked |
| Нарийн хясаа | Not needed | Care and cleaning: missing | Material: confirm "stainless steel" | Missing | Missing | Not tracked |
| Хөмсөгний сойзны иж бүрдэл | Contents: confirm | Care: missing | Not needed | Not needed | Missing | Not tracked |
| Налуу сойз | Not needed | Care: missing | Not needed | Not needed | Missing | Not tracked |
| Хөмсөгний арчилгааны багц | Contents: confirm (serum, gel, fine pencil) | Missing | Per item | Per item | Missing | Not tracked |

## Customer questions that cannot be answered today

| Question customers ask | Why it can't be answered | What to supply |
| --- | --- | --- |
| Яаж хэрэглэх вэ? Өдөрт хэдэн удаа? | No verified "how to use" | Steps, frequency, per product |
| Хэдий хугацаанд хэрэглэх вэ? | No verified duration | The manufacturer's recommended course, if any |
| Найрлага юу вэ? | No ingredient list | INCI list from the packaging |
| Хэдэн мл вэ? (gel, pomade, pencils) | No volume or weight | Net content from the packaging |
| Харшил, жирэмсэн, хөхүүл үед болох уу? | Only "ask your doctor" is allowed without verified data | Any manufacturer warnings; the chatbot will still refer to a doctor |
| Хэзээ үр дүн гарах вэ? Ургуулах уу? | Never answered with a promise, by policy | Nothing; this stays a "no promise" answer |
| Хадгалах хугацаа, хадгалах нөхцөл | No field holds it | Add to the product FAQ |
| Хаана үйлдвэрлэсэн, ямар брэнд, гэрчилгээ | Not published | Add to the product FAQ if true and documented |
| Аль өнгө надад тохирох вэ? | No shade guidance | A short shade guide in the product FAQ |
| Ажлын цаг, очиж авах, бэлэглэх | Shop FAQ is empty | Admin → Chat assistant → Knowledge → add questions |
| Бэлэн байгаа юу? (exact) | No stock counts, so always "available to order" | Enter stock per size in Products |

## Shop facts already published (fixed in code; tell the developer to change)

Delivery 1–2 working days in Ulaanbaatar and 2–5 in the countryside, fee 9,000₮, returns only for
damaged or wrong items within 24 hours, patch test advice, QPay or bank transfer (no cards), bank
account and contact. Confirm each is what you actually honour.
