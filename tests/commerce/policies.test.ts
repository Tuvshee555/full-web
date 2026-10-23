import test from "node:test";
import assert from "node:assert/strict";
import { BRAND_COPY, POLICIES, STORE } from "../../src/config/store";
import { privacyDocument, termsDocument, type LegalDocument } from "../../src/config/legal";
import { PAYMENT_WINDOW_MS, BANK_PAYMENT_WINDOW_MS } from "../../server/utils/orderPaid.js";

const allText = (doc: LegalDocument) => [doc.intro, ...doc.sections.flatMap((s) => [s.heading, ...(s.paragraphs ?? []), ...(s.items ?? [])])].join("\n");

for (const locale of ["mn", "en"] as const) {
  test(`${locale}: the FAQ and the Terms promise exactly the same delivery, returns and safety wording`, () => {
    const terms = allText(termsDocument(locale, "9,000₮"));
    assert.equal(BRAND_COPY[locale].faq[0].a, POLICIES[locale].delivery);
    assert.equal(BRAND_COPY[locale].faq[1].a, POLICIES[locale].returns);
    assert.equal(BRAND_COPY[locale].faq[2].a, POLICIES[locale].safety);
    for (const text of Object.values(POLICIES[locale])) assert.ok(terms.includes(text), `Terms must contain: ${text}`);
  });

  test(`${locale}: the Terms state the payment deadlines the server actually enforces`, () => {
    const terms = allText(termsDocument(locale, "9,000₮"));
    assert.equal(PAYMENT_WINDOW_MS, 15 * 60 * 1000);
    assert.equal(BANK_PAYMENT_WINDOW_MS, 24 * 60 * 60 * 1000);
    assert.match(terms, /\b15\b/);
    assert.match(terms, /\b24\b/);
    assert.ok(terms.includes("9,000₮"), "the delivery fee is shown");
  });

  test(`${locale}: the legal pages have no unfilled placeholders and name a real way to reach the shop`, () => {
    for (const doc of [termsDocument(locale, "9,000₮"), privacyDocument(locale)]) {
      const text = allText(doc);
      assert.ok(doc.sections.length >= 6);
      assert.ok(doc.sections.every((s) => s.heading.trim() && (s.paragraphs?.length || s.items?.length)));
      assert.doesNotMatch(text, /undefined|\{[a-z]+\}|NaN|null/i);
      assert.ok(text.includes(STORE.contact.email) || text.includes(STORE.contact.phone));
    }
  });
}

test("the privacy policy names the services that really receive customer data", () => {
  const text = allText(privacyDocument("en"));
  for (const service of ["QPay", "Vercel", "Neon", "Telegram", "OpenAI", "Meta", "Google"]) assert.ok(text.includes(service), `missing ${service}`);
  assert.match(text, /30 days/);
});
