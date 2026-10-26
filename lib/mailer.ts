import nodemailer from "nodemailer";

export function mailConfigured(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendMail(to: string[], subject: string, html: string) {
  if (!mailConfigured()) {
    return { sent: false, reason: "SMTP is not configured. Fill SMTP_* in .env to send emails." };
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to: to.join(", "),
    subject,
    html,
  });
  return { sent: true, to };
}
