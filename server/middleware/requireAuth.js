import jwt from "jsonwebtoken";
import { resolveUserRole } from "../utils/userRole.js";

export const requireAuth = async (req, res, next) => {
  const auth =
    req.headers.authorization ||
    req.headers.Authorization ||
    req.headers["authorization"];

  if (!auth || typeof auth !== "string" || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set; refusing to process auth");
    return res.status(500).json({ message: "Auth misconfiguration" });
  }

  const token = auth.slice(7).trim();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

    // Reject non-access tokens (e.g. password-reset tokens) so a reset link
    // — which travels through email, browser history and Referer headers —
    // can never be replayed as an API credential.
    if (decoded?.type && decoded.type !== "access") {
      return res.status(401).json({ message: "Invalid token" });
    }

    // Accept several common claim names so tokens from different flows work.
    const userId =
      decoded?.id ??
      decoded?.userId ??
      decoded?.user_id ??
      decoded?.userID ??
      null;
    const role = decoded?.role ?? decoded?.userRole ?? null;

    if (typeof userId !== "string" || !userId || userId.length > 128) {
      return res
        .status(401)
        .json({ message: "Invalid token: missing user id" });
    }

    // Elevated JWT claims must still match the current database role, including
    // on owner-or-admin endpoints that do not use requireAdmin.
    let currentRole = "USER";
    if (role === "ADMIN") {
      try {
        currentRole = await resolveUserRole(userId);
        if (!currentRole) return res.status(401).json({ message: "Invalid token" });
      } catch {
        return res.status(503).json({ message: "Authorization temporarily unavailable" });
      }
    }
    req.user = { id: userId, role: currentRole };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
