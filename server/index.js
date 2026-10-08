// Standalone API runner (no frontend), e.g. `npm run api`.
// Serves the same routes as /api on the combined server, but at the root.
import dotenv from "dotenv";

dotenv.config({ path: [".env.local", ".env"], quiet: true });

const { default: app, startBackend } = await import("./app.js");

const PORT = process.env.API_PORT || 4000;

await startBackend();
app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
