/** Source stateful routing: offered candidates first, current message before earlier context. */
import { getClarificationState, setClarificationState, clearClarificationState } from "./clarificationState";
import { customerTurn, joinContextAndTurn, markNoProduct } from "./customerTurn";
import { type Understanding } from "./productUnderstanding";
import { hasReferentialHint, isLikelyContextDependentText, lastAssistantReply, pickFastPathMatchText } from "./contextualText";
import { getProductSearchHaystack, isGenericProductRequest, phoneticLatinText, resolveProductFromUserMessage } from "./productSearch";
import type { CatalogProduct, ConversationState } from "./types";
import { isKnownGreetingPhrase } from "./greetingPhrases";
import { buildProductRequest, mergeProductSelection, type ProductSelection } from "./productRequest";
import { getProductSelection, setProductSelection } from "./productSelectionState";
const OWN_BUTTON_LABELS = ["Үнэ", "Өнгө, хэмжээ", "Хэрэглэх заавар", "Захиалах", "Price", "Variants", "How to use", "Order"];
function isOwnButtonLabel(text: string): boolean { return OWN_BUTTON_LABELS.some((label) => label.toLowerCase() === text.trim().toLowerCase()); }

export function filterCandidatesByAttribute(text: string, candidates: CatalogProduct[]): CatalogProduct[] {
  const phoneticTokens = (value: string) => phoneticLatinText(value).split(/\s+/).filter((word) => word.length >= 3 || /^\d+$/.test(word));
  const queryTokens = phoneticTokens(text).filter((word) => !/^(?:the|one|it|this|that|ene|ter|ni|color|colour|size|baina|baigaa)$/.test(word));
  if (queryTokens.length === 0 || queryTokens.every((word) => /^\d$/.test(word))) return [];
  return candidates.filter((product) => {
    const hayTokens = phoneticTokens(getProductSearchHaystack(product));
    return queryTokens.every((query) => hayTokens.some((hay) => hay.startsWith(query) || query.startsWith(hay)));
  });
}
function addsNarrowing(text: string, candidates: CatalogProduct[]): boolean {
  if (hasReferentialHint(text)) return true;
  const narrowed = filterCandidatesByAttribute(text, candidates);
  return narrowed.length > 0 && narrowed.length < candidates.length;
}
function looseNorm(value: string): string { return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim(); }
export function parseNumberedChoice(text: string): { index: number; namePrefix: string } | null {
  if (/^\s*(?:the\s+)?first(?:\s+one)?[.!?]?\s*$/i.test(text) || /^\s*(?:эхнийх?|нэгдүгээр|ehnii(?:h)?|ehnih)(?:\s+(?:нь|ni))?[.!?]?\s*$/iu.test(text)) return { index: 0, namePrefix: "" };
  const ordinal = /^\s*(\d{1,2})\s*-?\s*(?:р|дугаар|дахь|dahi)(?:\s+(?:нь|бүтээгдэхүүн|ni))?\s*[.!?]?\s*$/iu.exec(text);
  if (ordinal) return { index: Number(ordinal[1]) - 1, namePrefix: "" };
  const numbered = /^\s*(\d{1,2})\s*(?:[.)]\s*([\s\S]*))?$/u.exec(text);
  if (!numbered) return null;
  return { index: Number(numbered[1]) - 1, namePrefix: (numbered[2] || "").replace(/(?:\.\.\.|…)\s*$/, "").trim() };
}
function productsNamedByPrefix(prefix: string, products: CatalogProduct[]): CatalogProduct[] {
  const normalized = looseNorm(prefix);
  return normalized.length >= 3 ? products.filter((product) => looseNorm(product.foodName).startsWith(normalized)) : [];
}
export type FastPathRoute = {
  matchText: string; scopedClarify: CatalogProduct[] | null; scopedClarifyNote?: string;
  chosenProductId?: string; understanding?: Understanding; notInCatalog?: string;
  informationalAlternatives?: boolean; selection?: ProductSelection;
};
export async function routeFastPathText(input: {
  senderId: string; text: string; contextualUserText: string; products: CatalogProduct[];
  state?: ConversationState;
  history?: Array<{ role: "user" | "assistant"; text: string }>;
  understand?: (pendingProductIds: string[], selection?: ProductSelection | null) => Promise<Understanding | null>;
}): Promise<FastPathRoute> {
  const { senderId, text, contextualUserText, products } = input;
  const readSelection = () => input.state ? Promise.resolve((input.state.productSelection as { selection?: ProductSelection; updatedAt: number } | null)?.selection || null) : getProductSelection(senderId);
  const writeSelection = async (selection: ProductSelection | null) => { if (input.state) input.state.productSelection = selection ? { selection, updatedAt: Date.now() } : null; else await setProductSelection(senderId, selection); };
  const readClarification = () => input.state ? Promise.resolve(input.state.clarification as { candidateProductIds: string[]; createdAt: number } | null || null) : getClarificationState(senderId);
  const writeClarification = async (candidateProductIds: string[]) => { if (input.state) input.state.clarification = { candidateProductIds: candidateProductIds.slice(0, 8), createdAt: Date.now() }; else await setClarificationState(senderId, candidateProductIds); };
  const clearClarification = async () => { if (input.state) input.state.clarification = null; else await clearClarificationState(senderId); };
  const storedSelection = await readSelection();
  const previousSelection = storedSelection && products.some((product) => product.id === storedSelection.productId) ? storedSelection : null;
  const resolve = (value: string, pool: CatalogProduct[]) => resolveProductFromUserMessage(value, pool, { allowLooseFallback: false });
  const chose = async (product: CatalogProduct, understanding?: Understanding): Promise<FastPathRoute> => {
    await clearClarification();
    const selection = mergeProductSelection(product.id, buildProductRequest(text, [product], understanding), previousSelection);
    await writeSelection(selection);
    return { matchText: joinContextAndTurn(product.foodName, text), scopedClarify: null, chosenProductId: product.id, selection };
  };
  const tappedOwnButton = isOwnButtonLabel(text);
  const choice = parseNumberedChoice(text);
  const previousReply = input.history ? lastAssistantReply(input.history) : undefined;
  const pendingIsStale = previousReply !== undefined && !/\b[1-8][.)]\s|аль|which\s+(?:one|product)/iu.test(previousReply) && !choice && !tappedOwnButton;
  const pending = pendingIsStale ? null : await readClarification();
  if (pendingIsStale) await clearClarification();
  const pendingProducts = pending ? pending.candidateProductIds.map((id) => products.find((product) => product.id === id)).filter((product): product is CatalogProduct => Boolean(product)) : [];
  // Source ordering: deterministic numbered picks/buttons bypass the model; understanding runs once otherwise.
  if (input.understand && !choice && !tappedOwnButton) {
    const understanding = await input.understand(pendingProducts.map((product) => product.id), previousSelection);
    if (understanding) {
      if (understanding.unmet && understanding.products.length > 0) {
        await clearClarification();
        return { matchText: text, scopedClarify: understanding.products, informationalAlternatives: true, understanding };
      }
      if (understanding.certainty === "one") return { ...(await chose(understanding.products[0], understanding)), understanding };
      if (understanding.certainty === "several" && understanding.intent !== "catalog") {
        const offered = new Set(pendingProducts.map((product) => product.id));
        const sameAsOffered = offered.size === understanding.products.length && understanding.products.every((product) => offered.has(product.id));
        if (sameAsOffered) return { matchText: text, scopedClarify: null, understanding };
        await writeClarification( understanding.products.map((product) => product.id));
        return { matchText: text, scopedClarify: understanding.products, understanding };
      }
      await clearClarification();
      if (understanding.intent === "catalog" || understanding.unknownProduct) await writeSelection(null);
      const notInCatalog = understanding.unknownProduct && resolve(text, products).status === "not_found" ? understanding.unknownProduct : undefined;
      return { matchText: markNoProduct(text), scopedClarify: null, understanding, notInCatalog };
    }
  }
  if (pendingProducts.length > 0) {
    if (choice) {
      const byIndex = pendingProducts[choice.index];
      const named = choice.namePrefix ? productsNamedByPrefix(choice.namePrefix, products) : [];
      const namedPending = named.filter((product) => pendingProducts.includes(product));
      if (named.length > 0) {
        if (byIndex && named.includes(byIndex)) return chose(byIndex);
        if (namedPending.length === 1) return chose(namedPending[0]);
        if (named.length === 1) return chose(named[0]);
        const scoped = namedPending.length > 1 ? namedPending : named;
        await writeClarification( scoped.map((product) => product.id));
        return { matchText: text, scopedClarify: scoped };
      }
      if (byIndex) return chose(byIndex);
    }
    if (tappedOwnButton) {
      if (pendingProducts.length === 1) return chose(pendingProducts[0]);
      await writeClarification( pendingProducts.map((product) => product.id));
      return { matchText: text, scopedClarify: pendingProducts };
    }
    if (isGenericProductRequest(text)) {
      await writeClarification( pendingProducts.map((product) => product.id));
      return { matchText: text, scopedClarify: pendingProducts };
    }
    const scoped = resolve(text, pendingProducts);
    if (scoped.status === "verified") return chose(scoped.product);
    const byAttribute = filterCandidatesByAttribute(text, pendingProducts);
    if (byAttribute.length === 1) return chose(byAttribute[0]);
    const catalogDirect = resolve(text, products);
    if (catalogDirect.status === "verified" && !pendingProducts.some((product) => product.id === catalogDirect.product.id)) return chose(catalogDirect.product);
    if (scoped.status === "ambiguous") {
      const refined = filterCandidatesByAttribute(text, scoped.candidates);
      if (refined.length === 1) return chose(refined[0]);
      const candidates = refined.length > 1 ? refined : scoped.candidates;
      await writeClarification( candidates.map((product) => product.id));
      return { matchText: text, scopedClarify: candidates };
    }
    if (byAttribute.length > 1) {
      await writeClarification( byAttribute.map((product) => product.id));
      return { matchText: text, scopedClarify: byAttribute };
    }
    await clearClarification();
  }
  if (choice?.namePrefix) {
    const named = productsNamedByPrefix(choice.namePrefix, products);
    if (named.length === 1) return chose(named[0]);
    if (named.length > 1) { await writeClarification( named.map((product) => product.id)); return { matchText: text, scopedClarify: named }; }
  }
  const direct = resolve(text, products);
  if (contextualUserText !== text && direct.status === "not_found" && isKnownGreetingPhrase(text)) return { matchText: text, scopedClarify: null };
  if (direct.status === "verified" && !tappedOwnButton) return { ...(await chose(direct.product)), matchText: text };
  const followupRequest = previousSelection ? buildProductRequest(text, products) : null;
  if (previousSelection && direct.status === "not_found" && !isKnownGreetingPhrase(text) && (tappedOwnButton || Boolean(followupRequest?.variant) || (isLikelyContextDependentText(text) && Boolean(followupRequest?.topics.length)))) {
    const focused = products.find((product) => product.id === previousSelection.productId);
    if (focused) return chose(focused);
  }
  const contextual = contextualUserText !== text ? resolve(contextualUserText, products) : null;
  if (tappedOwnButton && contextual?.status === "verified") return chose(contextual.product);
  const directRejectsContextual = direct.status === "ambiguous" && !(contextual?.status === "verified" && direct.candidates.some((product) => product.id === contextual.product.id) && addsNarrowing(text, direct.candidates));
  if (contextualUserText !== text && isLikelyContextDependentText(text) && contextual?.status === "verified" && !directRejectsContextual) return chose(contextual.product);
  const picked = directRejectsContextual ? text : pickFastPathMatchText(text, contextualUserText, (value) => value === text ? direct : contextual ?? resolve(value, products));
  if (direct.status === "ambiguous") { await writeClarification( direct.candidates.map((product) => product.id)); return { matchText: text, scopedClarify: direct.candidates }; }
  if (contextual?.status === "ambiguous") { await writeClarification( contextual.candidates.map((product) => product.id)); return { matchText: text, scopedClarify: contextual.candidates }; }
  if (picked === contextualUserText && contextual?.status === "verified") return chose(contextual.product);
  if (picked === contextualUserText) return { matchText: customerTurn(picked), scopedClarify: null };
  return { matchText: picked, scopedClarify: null };
}
