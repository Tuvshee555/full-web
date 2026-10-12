import type { PrismaClient } from "@prisma/client";
import { prisma as sharedPrisma } from "../../server/utils/prisma.js";

/** The app's single Prisma client, typed for the TypeScript chatbot modules. */
export const prisma = sharedPrisma as PrismaClient;
