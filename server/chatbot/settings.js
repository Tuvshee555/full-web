import { prisma } from "../utils/prisma.js";

export const getSettings = () => prisma.chatSettings.upsert({
  where: { id: "default" }, create: { id: "default" }, update: {},
});
