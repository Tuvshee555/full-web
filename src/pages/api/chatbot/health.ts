import type { NextApiRequest, NextApiResponse } from "next";
export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  res.json({ ok: true, engine: "uudam-port", runtime: "next-pages-api" });
}
