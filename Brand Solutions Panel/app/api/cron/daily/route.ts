import { NextResponse } from "next/server";
import { buildDaily } from "@/lib/digest";
import { sendMail } from "@/lib/mailer";
import { cronAccess } from "@/lib/cron";
import { rosterEmails } from "@/lib/report";

export const dynamic = "force-dynamic";

// Runs every day at 6:00 AM IST. Reports the previous day. Goes to the manager.
export async function GET(req: Request) {
  const access = await cronAccess(req);
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 401 });

  const { subject, html } = await buildDaily();
  if (access === "preview") {
    return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const extra = (process.env.DAILY_DIGEST_TO ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const to = Array.from(new Set([...rosterEmails("MANAGER"), ...extra]));
  const result = await sendMail(to, subject, html);
  return NextResponse.json({ subject, ...result });
}
