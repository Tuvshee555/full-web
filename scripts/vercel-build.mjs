// Vercel runs this instead of `npm run build` (package.json "vercel-build").
// Production builds apply pending database migrations first, so new code is
// never served against an older schema. (On 2026-10-19 a rename migration was
// pushed but never applied; the live store showed no products for 4 days.)
// A failed migration fails the build, and the previous deployment keeps serving.
import { spawnSync } from "node:child_process";

const run = (command, args) => {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run("npx", ["prisma", "generate"]);
if (process.env.VERCEL_ENV === "production") {
  if (!process.env.DATABASE_URL || !process.env.DIRECT_URL) {
    console.error("DATABASE_URL and DIRECT_URL must be set for a production build.");
    process.exit(1);
  }
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV || "unset"}).`);
}
run("npx", ["next", "build"]);
