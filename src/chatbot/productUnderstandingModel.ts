import { askOpenAIChatParts } from "./openaiFallback";
import type { AskJson } from "./productUnderstanding";
const UNDERSTANDING_TIMEOUT_MS = 8_000;
/** Source model adapter, JSON only and deterministic. The owner's model choice (admin) wins over the env default. */
export function understandingModel(trace?: { requestId?: string; correlationId?: string; model?: string }): AskJson {
  return async (systemText, userText) => {
    const result = await askOpenAIChatParts([{ text: userText }], {
      systemText, jsonMode: true, temperature: 0, maxOutputTokens: 650,
      timeoutMs: UNDERSTANDING_TIMEOUT_MS,
      model: trace?.model || process.env.PRODUCT_UNDERSTANDING_MODEL || process.env.OPENAI_MODEL || "gpt-4.1",
      alternateModelAttempted: true, source: "product_understanding", requestId: trace?.requestId, correlationId: trace?.correlationId,
    });
    return result?.text ?? null;
  };
}
