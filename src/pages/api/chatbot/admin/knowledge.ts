import { apiRoute } from "../../../../chatbot/api";
import { requireAdminAccess } from "../../../../chatbot/adminAccess";
import { prisma } from "../../../../chatbot/prisma";
import { productFaqItems } from "../../../../chatbot/catalogue";
import { POLICIES, STORE } from "../../../../config/store-data.mjs";
import { deliveryFee } from "../../../../../server/utils/deliveryFee.js";

/** What the assistant knows and what is still missing, so the owner can fill the gaps product by product. */
export default apiRoute(async (req, res) => {
  if (!(await requireAdminAccess(req, res, "api.chatbot.admin.knowledge"))) return;
  if (req.method !== "GET") return res.status(405).end();
  const rows = await prisma.product.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, productName: true, volume: true, howToUse: true, ingredientList: true, safetyNotes: true, faq: true, updatedAt: true, sizes: { select: { label: true } } } });
  const products = rows.map((row) => {
    const faq = productFaqItems(row.faq);
    const volumeFromSize = row.sizes.some((size) => /\d\s*(?:мл|ml|г|g|gr)(?!\p{L})/iu.test(size.label));
    const facts = { volume: Boolean(row.volume?.trim()) || volumeFromSize, howToUse: Boolean(row.howToUse?.trim()), ingredientList: Boolean(row.ingredientList?.trim()), safetyNotes: Boolean(row.safetyNotes?.trim()), faq: faq.length };
    const missing = (["volume", "howToUse", "ingredientList"] as const).filter((key) => !facts[key]);
    return { id: row.id, productName: row.productName, updatedAt: row.updatedAt, facts, missing };
  });
  return res.json({
    ok: true, products,
    complete: products.filter((product) => product.missing.length === 0).length,
    policies: POLICIES, deliveryFee: deliveryFee(),
    store: { contact: STORE.contact, bank: STORE.bank, paymentMethods: ["QPay", "bank"] },
  });
});
