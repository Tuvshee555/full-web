import { transporter } from "../../utils/mailer.js";
import { saveOtp } from "../../utils/otp-store.js";
import { randomInt } from "node:crypto";
import { normalizeEmail } from "../../utils/authValidation.js";

export const sendOtp = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!email) return res.status(400).json({ message: "Имэйл оруулна уу" });

    const otp = randomInt(100000, 1000000).toString();

    await saveOtp(email, otp);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: "Таны баталгаажуулах код",
      html: `<h1>${otp}</h1>`,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("SEND OTP ERROR:", err?.message || err);
    return res.status(500).json({ message: "Имэйл илгээхэд алдаа" });
  }
};
