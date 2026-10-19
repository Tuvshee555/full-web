import nodemailer from "nodemailer";
import { STORE } from "../../src/config/store-data.mjs";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmail({ to, subject, html, text } = {}) {
  if (!to) return;
  const address = process.env.SMTP_FROM || process.env.SMTP_USER;
  // Inboxes show the shop's name, not a bare address
  const from = address && !address.includes("<") ? `"${STORE.name}" <${address}>` : address;
  const mailOptions = {
    from,
    to,
    subject,
    ...(html ? { html } : { text }),
  };
  await transporter.sendMail(mailOptions);
}
