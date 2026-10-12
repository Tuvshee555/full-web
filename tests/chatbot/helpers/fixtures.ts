import type { CatalogProduct, CatalogueContext, BotSettings } from "../../../src/chatbot/types";

export const products: CatalogProduct[] = [
  { id: "test-serum-a", foodName: "Test Serum A", price: 1000, oldPrice: null, discount: null, ingredients: "Test ingredient A", category: { name: "Test serum" }, sizes: [{ id: "test-size-a", label: "Test Size A", price: 1000, stock: null }] },
  { id: "test-pencil-b", foodName: "Test Pencil B", price: 2000, oldPrice: null, category: { name: "Test pencil" }, sizes: [{ id: "test-colour-b", label: "Test Brown B", price: 2000, stock: 1 }, { id: "test-colour-c", label: "Test Brown C", price: 2000, stock: 0 }] },
  { id: "test-pencil-c", foodName: "Test Pencil C", price: 3000, oldPrice: null, category: { name: "Test pencil" }, sizes: [{ id: "test-colour-d", label: "Test Brown D", price: 3000, stock: 20 }] },
  { id: "test-balm-d", foodName: "Test Balm D", price: 4000, oldPrice: 5000, discount: 20, category: { name: "Test balm" }, sizes: [{ id: "test-size-d", label: "Test Size D", price: 4000, stock: 3 }] },
];
export const settings: BotSettings = {
  enabled: true, metaOutbound: false,
  greetingMn: "Сайн байна уу. Бүтээгдэхүүн, хүргэлт, захиалгын талаар асуугаарай.",
  greetingEn: "Hello. I can help with products, delivery and orders.",
  handoffMn: "Манай ажилтан тантай холбогдоно.", handoffEn: "A member of staff will contact you.",
  lowStockThreshold: 5, showExactStock: false, extraKnowledgeMn: "", extraKnowledgeEn: "",
};
export function context(locale: "mn" | "en" = "en"): CatalogueContext {
  return {
    products: structuredClone(products), settings: { ...settings }, locale, site: "https://shop.example.invalid", deliveryFee: 100,
    store: { contact: { phone: "00000000", email: "test@example.invalid" }, bank: { name: "Test Bank", holder: "Test Shop", account: "0000000000" } },
    brand: { faq: [], about: ["Test shop information."] },
    content: { default: { howTo: ["Test application instruction."], fullIngredients: "Test ingredient A", faq: [{ q: "Test question", a: "Test answer" }] } },
  };
}
export const fakeOrder = { number: "QA00001", phone: "00000001", wrongPhone: "00000002", status: "PAID", privateMarker: "TEST_PRIVATE_ORDER_ADDRESS" };
