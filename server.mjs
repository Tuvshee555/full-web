// Single entry point for the merged app:
//   /api/*   -> Express backend (server/app.js)
//   /admin/* -> admin dashboard (Next.js, src/app/(admin))
//   /*       -> customer storefront (Next.js, src/app/(customer))
//
//   npm run dev    development (hot reload)
//   npm start      production (run `npm run build` first)
import dotenv from "dotenv";

const dev = process.argv.includes("--dev");
process.env.NODE_ENV = dev ? "development" : "production";

// Load env before importing the API: its routers create the Prisma client at
// import time. Next.js loads the same files again for the frontend.
const mode = dev ? "development" : "production";
dotenv.config({
  path: [`.env.${mode}.local`, ".env.local", `.env.${mode}`, ".env"],
  quiet: true,
});

const { default: express } = await import("express");
const { default: next } = await import("next");
const { default: api, startBackend } = await import("./server/app.js");

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOST || "localhost";

const nextApp = next({ dev, hostname, port });
const handle = nextApp.getRequestHandler();

await startBackend();
await nextApp.prepare();

const server = express();
server.disable("x-powered-by");
server.use("/api", api);
server.all("*", (req, res) => handle(req, res));

server.listen(port, () => {
  console.log(`Ready on http://${hostname}:${port}`);
  console.log(`  storefront  http://${hostname}:${port}/`);
  console.log(`  admin       http://${hostname}:${port}/admin`);
  console.log(`  api         http://${hostname}:${port}/api`);
});
