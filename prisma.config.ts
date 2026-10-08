// With a config file Prisma no longer reads .env on its own, so load the same
// files the app uses (.env.local wins).
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

export default defineConfig({
  schema: path.join("server", "prisma", "schema.prisma"),
});
