# Owner checklist: product facts the chatbot may use (updated 2 November 2026)

The chatbot repeats only facts you have **verified**. Every product now has a Verification section
(Admin → Products → open the product → Verification) with one tick per fact. Until a fact is ticked,
the assistant tells customers it is not published yet and gives your phone and email; the product
page shows your text either way. Nothing below was invented to fill a gap.

## Why nothing is verified yet

All 10 products were created on 10 October 2026 by the starter-catalogue script and never edited.
Their descriptions, "how to use" sentences, sizes, prices and photos (stock images) are placeholders,
not facts about real Lorentz products. After this release they appear in Admin → AI Chatbot →
Knowledge as **Unverified** (text exists) or **Missing** (nothing entered).

Two placeholder sentences need particular care:

- **Хөмсөгний тос** says it nourishes brows *and lashes* and is applied before bed. Lash use is near
  the eye. The assistant does not repeat this (the description is unverified); confirm with the
  manufacturer before ticking "Benefit claims", or remove "сормуус" from the text.
- **Хөмсөгний сэрум** says to apply every evening and keep it out of the eyes. Confirm against the
  real packaging before ticking "How to use".

## How to complete one product (5 minutes each)

1. Open the product. Replace the placeholder description with what the product really is.
2. Fill in: Volume (ml or g), How to use (one step per line), How often, Ingredients (INCI list from
   the packaging), Safety notes (from the packaging), Storage and shelf life, and any Questions and
   answers customers ask (for example how long a bottle lasts, which shade suits whom).
3. In Verification, tick only what you checked against the real product or its packaging. Editing a
   fact's text later clears its tick automatically, so what the assistant says is always what you checked.
4. Save. The next chat answer uses it (no restart, no cache to clear).

## Per product (status before your edits)

| Product | Description / claims | Volume | How to use, how often | Ingredients | Safety | Storage | FAQ | Price | Stock |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Хөмсөгний сэрум | Unverified (placeholder) | "5 мл" size label: confirm | Missing | Missing | Missing | Missing | Missing | Unverified | Not counted |
| Хөмсөгний тос | Unverified (lash claim) | "10 мл" size label: confirm | Missing | Missing | Missing | Missing | Missing | Unverified | Not counted |
| Тунгалаг хөмсөгний гель | Unverified | Missing ("6 мл" only in the description) | Missing | Missing | Missing | Missing | Missing | Unverified | Not counted |
| Хөмсөгний помад | Unverified | Missing (weight) | Missing | Missing | Missing | Missing | Missing | Unverified | 3 shades, not counted |
| Нарийн үзүүртэй хөмсөгний харандаа | Unverified | Missing | Missing | Missing | Missing | Missing | Missing | Unverified | 3 shades, not counted |
| Модон хөмсөгний харандаа | Unverified | Missing | Missing | Missing | Missing | Missing | Missing | Unverified | 3 shades, not counted |
| Нарийн хясаа | Unverified ("stainless steel": confirm) | Not needed | Care and cleaning: missing | Not needed | Missing | Not needed | Missing | Unverified | Not counted |
| Хөмсөгний сойзны иж бүрдэл | Unverified (contents: confirm) | Not needed | Care: missing | Not needed | Not needed | Not needed | Missing | Unverified | Not counted |
| Налуу сойз | Unverified | Not needed | Care: missing | Not needed | Not needed | Not needed | Missing | Unverified | Not counted |
| Хөмсөгний арчилгааны багц | Unverified (contents: serum, gel, fine pencil — confirm) | Contents | Per item | Per item | Per item | Per item | Missing | Unverified | Not counted |

"Price" and "Photos" ticks are for your own bookkeeping (the chatbot always quotes the live price);
tick them once you have confirmed the number you charge and replaced the stock photos.

## Customer questions that cannot be answered until then

| Question customers ask | Why it can't be answered today | What to supply |
| --- | --- | --- |
| Яаж хэрэглэх вэ? Өдөрт хэдэн удаа? | No verified "how to use" / "how often" | Steps and frequency, per product, then tick |
| Хэдий хугацаанд хэрэглэх вэ? Хэдэн сар? | No verified duration | A FAQ answer such as "Тасралтгүй 8 долоо хоног", if the manufacturer says so |
| Найрлага юу вэ? Юунаас бүрдсэн бэ? | No ingredient list | INCI list from the packaging |
| Хэдэн мл вэ? (gel, pomade, pencils) | No volume or weight | Net content from the packaging |
| Яаж хадгалах вэ? Хугацаа нь хэзээ дуусах вэ? | No storage / shelf-life text | From the packaging |
| Харшил, жирэмсэн, хөхүүл үед болох уу? | Only "ask your doctor" is allowed without verified data | Manufacturer warnings; the assistant will still refer to a doctor |
| Хэзээ үр дүн гарах вэ? Ургуулах уу? | Never answered with a promise, by policy | Nothing; this stays a "no promise" answer |
| Хаана үйлдвэрлэсэн, ямар брэнд, гэрчилгээ | Not published | A product FAQ entry, if true and documented |
| Аль өнгө надад тохирох вэ? | No shade guidance | A short shade guide in the product FAQ |
| Ажлын цаг, очиж авах, бэлэглэх | Shop FAQ is empty | Admin → AI Chatbot → Knowledge → add questions |
| Бэлэн байгаа юу? (exact) | No stock counts, so always "available to order" | Enter stock per option in Products |

## Shop facts already published (fixed in code; tell the developer to change)

Delivery 1–2 working days in Ulaanbaatar and 2–5 in the countryside, fee 9,000₮, returns only for
damaged or wrong items within 24 hours, patch test advice, QPay or bank transfer (no cards), bank
account and contact, and now: chat orders hold stock for 60 minutes (you can change this in
AI settings). Confirm each is what you actually honour.
