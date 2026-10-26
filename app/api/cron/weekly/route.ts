import { NextResponse } from "next/server";
import { buildWeekly } from "@/lib/digest";
import { sendMail } from "@/lib/mailer";
import { cronAccess } from "@/lib/cron";
import { rosterEmails } from "@/lib/report";

export const dynamic = "force-dynamic";

// Runs every Saturday at 9:00 AM IST. Reports the seven days ending yesterday.
// Goes to the manager plus anyone in LEADERSHIP_EMAILS.
export async function GET(req: Request) {
  const access = await cronAccess(req);
  if (!access) return NextResponse.json({ error: "Not allowed." }, { status: 401 });

  const { subject, html } = await buildWeekly();
  if (access === "preview") {
    return new NextResponse(html, { headers: { "content-type": "text/html; charset=utf-8" } });
  }

  const leadership = (process.env.LEADERSHIP_EMAILS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const to = Array.from(new Set([...rosterEmails("MANAGER"), ...leadership]));
  const result = await sendMail(to, subject, html);
  return NextResponse.json({ subject, ...result });
}
