// Runs a throwaway local PostgreSQL for development, no install needed.
// Data lives in ./.local-db. Leave this running in its own terminal, then:
//   npm run db:migrate   (first time only)
//   npm run dev
//
// Matching .env.local value (instead of a hosted DB):
//   DATABASE_URL="postgresql://postgres:postgres@localhost:5433/eyebrow?sslmode=disable"
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import path from "node:path";

const dataDir = path.resolve(".local-db");
const firstRun = !existsSync(path.join(dataDir, "PG_VERSION"));

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: "postgres",
  password: "postgres",
  port: 5433,
  persistent: true,
});

if (firstRun) await pg.initialise();
await pg.start();

try {
  await pg.createDatabase("eyebrow");
  console.log('Created database "eyebrow"');
} catch {
  // already exists
}

console.log("Local Postgres running on localhost:5433 (Ctrl+C to stop)");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
