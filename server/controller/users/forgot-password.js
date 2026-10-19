import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendEmail } from "../../utils/send-email.js";
import { prisma } from "../../prismaClient.js";
import { siteUrl } from "../../utils/siteUrl.js";
import { normalizeEmail } from "../../utils/authValidation.js";

const RESET_TTL_MS = 15 * 60 * 1000; // 15 minutes

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body ?? {};
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) return res.status(400).json({ message: "Enter a valid email" });

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    });

    // Always respond the same way — never reveal whether the account exists.
    const genericResponse = {
      message: "If that account exists, a reset email has been sent",
    };

    if (!user) {
      return res.json(genericResponse);
    }

    if (!process.env.JWT_SECRET) {
      return res.status(500).json({ message: "Auth not configured" });
    }

    const resetToken = jwt.sign(
      { id: user.id, type: "reset", jti: crypto.randomUUID() },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // Store only a hash of the token so it can be verified once and then
    // invalidated (single-use), even though the token itself is a JWT.
    const tokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: tokenHash,
        resetTokenExpiry: new Date(Date.now() + RESET_TTL_MS),
      },
    });

    // The reset page belongs to the admin app, served under /admin.
    const site = siteUrl();
    const resetBaseUrl = process.env.ADMIN_URL || `${site}/admin`;

    if (!resetBaseUrl) {
      return res.status(500).json({ message: "Reset password URL is not configured" });
    }

    const locale = req.body.locale === "en" ? "en" : "mn";
    const base = resetBaseUrl.replace(/\/$/, "").replace(/\/(mn|en)$/, "");
    const resetLink = `${base}/${locale}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await sendEmail({
      to: user.email,
      subject: "Password Reset",
      text: `Click here: ${resetLink}`,
    });

    return res.json(genericResponse);
  } catch (err) {
    console.error("Forgot password error:", err?.message || err);
    return res.status(500).json({ message: "Server error" });
  }
};
