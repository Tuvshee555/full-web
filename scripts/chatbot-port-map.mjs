import fs from "node:fs";
import path from "node:path";

// The import manifest is immutable; every original file remains reviewable in commit 20000f9.
const manifest = JSON.parse(fs.readFileSync("docs/chatbot/UUDAM_IMPORT.json", "utf8"));
const drops = new Map();
const drop = (names, reason) => names.split(/\s+/).filter(Boolean).forEach(name => drops.set(name, reason));
drop("adminDatePricing ageRules birthYearAgeBands passengerTotalReply priceGroups", "Travel departure fares, passenger counts, age bands and infant tiers have no shop equivalent.");
drop("adminMediaUpload assistantQuickActions adminProposalUtils adminTypes jsonEditorPrompt travelAI travelAIGuides travelAIValidation travelOps", "Travel operator catalogue mutation/file-import assistant is removed; Lorentz keeps its existing product editor.");
drop("bookingWebsite connectedTripMapping connectedTripStore tripWebsiteParity tripWebsiteParityValue websiteSyncTransaction websiteTripBridge websiteTripDetails websiteTripPayload websiteTripSync", "Separate travel booking website projection and synchronization are removed; products already share the Lorentz database.");
drop("customerDocuments fileParse docxText", "Travel customer documents and uploaded travel catalogue parsing are removed.");
drop("flowEngine", "The owner explicitly excludes the travel flow builder.");
drop("googleDriveLinks googleDriveSync", "The owner explicitly excludes Google Drive synchronization.");
drop("qpay travelPayments", "Uudam payment integration is removed; Lorentz already owns its QPay and bank-transfer paths.");
drop("travelDates tripCatalogPdf tripHotelReply tripItineraryBoundaries tripPlaceDaysReply tripWeather travelFastPathsProgram", "Travel dates, itineraries, hotels, destination duration/weather and programme PDFs are excluded.");

const testDrops = new Map();
const dropTests = (names, reason) => names.split(/\s+/).filter(Boolean).forEach(name => testDrops.set(`${name}.test.ts`, reason));
dropTests("admin-date-pricing age-range-picker age-rules-and-infant-tier passenger-total-and-groups price-groups price-groups-note-survives-normalize", "Tests only the removed departure fare/age/passenger model.");
dropTests("admin-trip-editor-ui assistant-quick-actions assistant-quick-actions-ui admin-media-upload admin-proposal-utils admin-source-evidence travel-ai-photos travel-ops-validation travel-trip-maintenance trips-sections", "Tests removed travel operator catalogue editing, travel media import or travel AI mutation.");
dropTests("connected-trip-mapping shared-trip-safety site-photo-hosts website-canonical-offers website-parity website-poster-structured-facts website-sync-content-conflict website-sync-transaction website-trip-bridge", "Tests only removed travel website projections and synchronization.");
dropTests("customer-documents file-parse", "Tests only removed travel document extraction/import.");
dropTests("flow-engine google-drive-links qpay", "Tests only explicitly removed flow builder, Drive integration or Uudam QPay.");
dropTests("itinerary-day-controls itinerary-days-schema trip-itinerary-boundaries trip-calendar-recurring trip-weather travel-dates seasons travel-program-photos", "Tests only excluded itineraries, departure calendars, weather or seasons.");
dropTests("dedupe-photos trip-photo-import-extract trip-photo-import-match trip-photo-import-normalize trip-photo-upload", "Tests only explicitly excluded travel photo import.");
dropTests("poster-age-range-unit poster-bulk-plan poster-extract-merge poster-infant-free-fare poster-pdf-image-policy poster-placeholder-data-2026-09-28 poster-sync poster-trip-mapper", "Tests only explicitly excluded travel poster extraction/rendering/synchronization.");

const keeps = new Set("encoding processState resilience webhookSecurity metaOutboundKillSwitch strings staffTakeover webhookAttachments chatbotQuality chatbotAccuracy".split(" "));
const keepTests = new Set(["resilience.test.ts", "webhook-security.test.ts", "meta-outbound-kill-switch.test.ts"]);
const destinations = {
  aiTripContext: "src/chatbot/productContext.ts", travelTextNorm: "src/chatbot/textNorm.ts",
  travelFastPathsSearch: "src/chatbot/productSearch.ts", travelFastPathsPricing: "src/chatbot/productPriceBlock.ts",
  travelFastPaths: "src/chatbot/reply.ts", tripFareBlock: "src/chatbot/productPriceBlock.ts",
  tripAnswerPlan: "src/chatbot/productAnswerPlan.ts", tripAnswerRuntime: "src/chatbot/handler.ts",
  tripUnderstanding: "src/chatbot/productUnderstanding.ts", tripUnderstandingModel: "src/chatbot/productUnderstandingModel.ts",
  tripReplyVerification: "src/chatbot/productReplyVerification.ts", tripRequest: "src/chatbot/productRequest.ts",
  tripSelectionState: "src/chatbot/productSelectionState.ts", travelTypes: "src/chatbot/types.ts",
  travelDb: "src/chatbot/catalogue.ts", tripFacts: "src/chatbot/productFacts.ts",
  tripExtraSchema: "src/chatbot/productFacts.ts", tripDataValidation: "src/chatbot/catalogue.ts",
  tripCompleteness: "src/chatbot/productFacts.ts", tripConsistency: "src/chatbot/productReplyVerification.ts",
  tripCategorization: "src/chatbot/catalogue.ts", tripOffers: "src/chatbot/productRequest.ts",
  departureAvailability: "server/utils/stockLevel.js", departureSeats: "server/utils/stockLevel.js",
  businessData: "src/chatbot/catalogue.ts", travelSchema: "server/prisma/schema.prisma",
  travelMessages: "src/chatbot/conversation.ts", travelLeadsDb: "src/chatbot/handler.ts",
  travelSessionDb: "src/chatbot/conversationState.ts", neonDb: "server/utils/prisma.js",
  redisState: "src/chatbot/conversationState.ts", dailyHealthCheck: "src/chatbot/readiness.ts",
  assistantLog: "src/chatbot/errorLogStore.ts", bookingCollect: "src/chatbot/handler.ts",
  bookingCollectFlow: "src/chatbot/handler.ts", photoOnlyState: "src/chatbot/conversationState.ts",
  webhookPhotoOnly: "src/chatbot/webhookMedia.ts", selfConsistency: "src/chatbot/productReplyVerification.ts",
};
const adminDrop = {
  "adminTabData.ts": "Travel JSON/catalogue editor draft state is removed.",
};
const routeDrop = {
  "ai-change.ts": "Travel catalogue mutation assistant is removed; existing Lorentz product editing remains authoritative.",
  "broadcast.ts": "Travel mass-marketing broadcast feature is outside the requested customer-support channels.",
};
const entries = manifest.files.map(file => {
  let status = "ADAPT", reason = "Preserve the original mechanism and replace travel evidence/storage with Lorentz products, variants, config and Prisma.";
  let destination = destinations[path.basename(file.source, path.extname(file.source))] || file.destination;
  if (file.source.startsWith("src/lib/")) {
    const key = path.basename(file.source, path.extname(file.source));
    if (/^src\/lib\/(poster|tripPhotoImport)\//.test(file.source)) { status = "DROP"; reason = "Explicitly excluded travel poster/PDF or trip photo import implementation."; }
    else if (drops.has(key)) { status = "DROP"; reason = drops.get(key); }
    else if (keeps.has(key)) { status = "KEEP"; reason = "Domain-independent mechanism; retained with local imports and safe runtime configuration."; }
  } else if (file.source.startsWith("tests/")) {
    const key = path.basename(file.source);
    if (testDrops.has(key)) { status = "DROP"; reason = testDrops.get(key); }
    else if (keepTests.has(key)) { status = "KEEP"; reason = "Original invariant assertions retained; imports point to the ported module."; }
    else { reason = "Translate each retained behaviour to fake shop fixtures, injected state/provider or the equivalent authenticated API."; }
  } else if (file.source.startsWith("src/components/admin/")) {
    const key = path.basename(file.source);
    if (adminDrop[key]) { status = "DROP"; reason = adminDrop[key]; }
    else reason = "Retain chatbot controls and restyle/integrate with the Lorentz admin; static contact facts come from STORE.";
  } else if (file.source.includes("/api/admin/")) {
    const key = path.basename(file.source);
    if (routeDrop[key]) { status = "DROP"; reason = routeDrop[key]; }
    else reason = "Retain authenticated chatbot administration backed by the existing ADMIN JWT and Chat tables.";
  } else reason = "Route every channel through the same ported message engine; signed Meta handling stays disabled without its env flags.";
  if (status === "DROP") destination = "—";
  return { ...file, status, finalDestination: destination, reason };
});
const counts = Object.fromEntries(["KEEP", "ADAPT", "DROP"].map(status => [status, entries.filter(row => row.status === status).length]));
const groups = ["src/lib/", "src/pages/api/", "src/components/admin/", "tests/"];
const tables = groups.map(prefix => {
  const rows = entries.filter(row => row.source.startsWith(prefix));
  const label = prefix === "src/lib/" ? "Library" : prefix === "tests/" ? "Tests (including helper)" : prefix.includes("pages") ? "API routes" : "Admin components";
  return `## ${label}: ${rows.length} files\n\n| Uudam source | Decision | Lorentz destination | Reason |\n| --- | --- | --- | --- |\n${rows.map(row => `| ${row.source} | ${row.status} | ${row.finalDestination} | ${row.reason} |`).join("\n")}\n`;
});
const text = `# Uudam → Lorentz port map\n\nThe immutable import is commit \`20000f9\`, from Uudam HEAD \`${manifest.sourceHead}\`. This table covers **all ${entries.length} copied files**, including the test environment helper. Totals: **KEEP ${counts.KEEP}, ADAPT ${counts.ADAPT}, DROP ${counts.DROP}** (${counts.KEEP + counts.ADAPT + counts.DROP} = ${entries.length}). The source repository was read-only. The external/shared reply map was not read because the user's repository instructions prohibit shared agent memory.\n\n## Domain mapping\n\n| Uudam | Lorentz |\n| --- | --- |\n| Trip catalogue and aliases | Food catalogue and product names/aliases |\n| Numbered trip choices | Remembered numbered product choices |\n| Departure selection | FoodSize colour/size selection |\n| Departure scarcity/fare writer | Stock helper and one product/variant formatter |\n| Booking collection | Order help and name/phone only for a handoff |\n| Travel FAQ/company facts | PRODUCT_CONTENT, STORE, BRAND_COPY and owner extra knowledge |\n| pg/Redis state | Existing Prisma Chat tables and additive durable receipt/state fields |\n| Handoff pause | needsHuman only; pause requires admin takeover |\n| Channel-specific handlers | One handleCustomerMessage/runCustomerTurn entry path |\n\nTravel-only cases inside mixed regression suites are replaced by product/variant equivalents; a mixed suite is not dropped merely because its filename contains “trip” or “travel”. Retained test files must execute through \`npm run test:chatbot\`; exclusions are limited to DROP rows.\n\n${tables.join("\n")}`;
fs.writeFileSync("docs/chatbot/PORT_MAP.md", text);
fs.writeFileSync("docs/chatbot/PORT_MAP.json", JSON.stringify({ sourceHead: manifest.sourceHead, total: entries.length, counts, files: entries }, null, 2) + "\n");
console.log(JSON.stringify({ total: entries.length, counts, activeTestFiles: entries.filter(row => row.source.startsWith("tests/") && row.status !== "DROP").length }));
