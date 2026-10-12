/** Request-local shop time context; dates do not select products. */
export function buildTemporalPromptContext(_text = "", now = new Date()): string {
  return `Current date in Mongolia: ${new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ulaanbaatar", year: "numeric", month: "2-digit", day: "2-digit" }).format(now)}. Do not infer delivery deadlines.`;
}
