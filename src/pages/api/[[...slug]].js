// Runs the Express API (server/app.js) inside Next.js, so one deployment serves
// the storefront, the admin AND /api/* (needed on Vercel, where server.mjs is
// not used). Locally, `npm run dev` still goes through server.mjs as before.
import app from "../../../server/app.js";
import { runDueJobs } from "../../../server/utils/lazyJobs.js";
import { background, backgroundSettled } from "../../../server/utils/background.js";
import { waitUntil } from "@vercel/functions";

export const config = {
  api: {
    bodyParser: false, // Express parses the body itself (it also keeps the raw bytes)
    externalResolver: true, // Express sends the response
  },
  maxDuration: 30,
};

export default async function handler(req, res) {
  // This route sees "/api/food"; the Express app serves "/food".
  req.url = req.url.replace(/^\/api(?=\/|\?|$)/, "") || "/";

  // Next pre-fills req.query (including this route's own "slug"); let Express
  // parse the real query string instead.
  Object.defineProperty(req, "query", { value: undefined, writable: true, configurable: true });

  // Maintenance must not delay the customer's catalogue/payment request. The
  // response lifecycle below keeps it alive on serverless hosts.
  background(runDueJobs());

  return new Promise((resolve) => {
    res.once("close", () => {
      // Keep the function alive for post-response work (order alerts, emails).
      waitUntil(backgroundSettled());
      resolve();
    });
    app(req, res);
  });
}
