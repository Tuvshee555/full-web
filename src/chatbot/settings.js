import { prisma } from "../../server/utils/prisma.js";
import { cached, invalidate } from "../../server/utils/cache.js";

// Catalog requests need the stock visibility policy too. Read the settings
// once per short interval, rather than issuing a database write per visitor.
export const getSettings = () => cached("settings:default", 5_000, async () => {
  const settings = await prisma.chatSettings.findUnique({ where: { id: "default" } });
  return settings ?? prisma.chatSettings.upsert({
    where: { id: "default" }, create: { id: "default" }, update: {},
  });
});

export const invalidateSettings = () => invalidate("settings:");
